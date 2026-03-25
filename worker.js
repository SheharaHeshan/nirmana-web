export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const method = request.method;
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    const baseUrl = env.R2_PUBLIC_URL || url.origin;

    const sanitizeFilename = (name) => {
      // Replace spaces and specific special chars with underscores
      return name.replace(/[^a-zA-Z0-9._-]/g, '_');
    };

    try {
      if (method === "GET" && (url.pathname.startsWith("/projects/") || url.pathname.startsWith("/vendors/"))) {
        const objectPath = decodeURIComponent(url.pathname.substring(1)); 
        const object = await env.MY_BUCKET.get(objectPath);
        if (object === null) {
          return new Response("Not Found", { status: 404, headers: corsHeaders });
        }
        const headers = new Headers(corsHeaders);
        object.writeHttpMetadata(headers);
        headers.set("etag", object.httpEtag);
        return new Response(object.body, { headers });
      }

      // ---------------------------------------------------------
      // 1. SECTORS & FINISHES (CRUD)
      // ---------------------------------------------------------
      if (url.pathname.startsWith("/api/sectors")) {
        if (method === "POST") { // Create or Update
          const { id, name } = await request.json();
          if (id) {
            await env.DB.prepare("UPDATE sectors SET name = ? WHERE id = ?").bind(name, id).run();
          } else {
            await env.DB.prepare("INSERT INTO sectors (name) VALUES (?)").bind(name).run();
          }
          return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
        }
        if (method === "DELETE") {
          const id = url.searchParams.get("id");
          await env.DB.prepare("DELETE FROM sectors WHERE id = ?").bind(id).run();
          return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
        }
      }

      if (url.pathname.startsWith("/api/finishes")) {
        if (method === "POST") {
          const { id, name } = await request.json();
          if (id) {
            await env.DB.prepare("UPDATE finishes SET name = ? WHERE id = ?").bind(name, id).run();
          } else {
            await env.DB.prepare("INSERT INTO finishes (name) VALUES (?)").bind(name).run();
          }
          return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
        }
        if (method === "DELETE") {
          const id = url.searchParams.get("id");
          await env.DB.prepare("DELETE FROM finishes WHERE id = ?").bind(id).run();
          return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
        }
      }

      // ---------------------------------------------------------
// 2. PROJECTS (CRUD + R2 Image Management)
// ---------------------------------------------------------
if (url.pathname.startsWith("/api/projects")) {
  
  // --- CREATE or UPDATE PROJECT ---
  if (method === "POST") {
    const formData = await request.formData();
    const id = formData.get("id"); // If ID exists, it's an EDIT
    const title = formData.get("title");
    const sectorId = formData.get("sector_id");
    const finishId = formData.get("finish_id");
    const description = formData.get("description");
    const country = formData.get("country"); // Added to match your UI

    // Get files using the keys sent by data.js
    const primaryFile = formData.get("primary_image");
    const galleryFiles = formData.getAll("gallery_images");

    let projectId = id;

    try {
      if (id) {
        // Update existing record
        await env.DB.prepare(
          "UPDATE projects SET title=?, sector_id=?, finish_id=?, description=?, country=? WHERE id=?"
        ).bind(title, sectorId, finishId, description, country, id).run();
      } else {
        // Insert new record
        const { results } = await env.DB.prepare(
          "INSERT INTO projects (title, sector_id, finish_id, description, country) VALUES (?, ?, ?, ?, ?) RETURNING id"
        ).bind(title, sectorId, finishId, description, country).run();
        projectId = results[0].id;
      }

      // --- HANDLE IMAGE UPLOADS ---
      
      // 1. Process Primary/Feature Image
      if (primaryFile && primaryFile.size > 0) {
        const primaryKey = `projects/${projectId}/primary/${crypto.randomUUID()}-${sanitizeFilename(primaryFile.name)}`;
        await env.MY_BUCKET.put(primaryKey, primaryFile.stream(), {
          httpMetadata: { contentType: primaryFile.type } 
        });
        const primaryUrl = `${baseUrl}/${primaryKey}`;
        
        await env.DB.prepare("UPDATE projects SET primary_image = ? WHERE id = ?")
          .bind(primaryUrl, projectId).run();
      } else if (id && !formData.has("existing_primary")) {
        // If editing and no new primary file, but existing_primary is not present, user removed it.
        await env.DB.prepare("UPDATE projects SET primary_image = NULL WHERE id = ?")
          .bind(projectId).run();
      }

      // 2. Process Gallery Images
      let finalGalleryUrls = [];
      const existingGalleryJson = formData.get("existing_gallery");
      if (existingGalleryJson) {
        try {
          finalGalleryUrls = JSON.parse(existingGalleryJson);
        } catch (e) {
          console.error("Failed to parse existing_gallery:", e);
        }
      }

      if (galleryFiles.length > 0 && galleryFiles[0].size > 0) {
        for (const file of galleryFiles) {
          if (file.size === 0) continue;
          const galleryKey = `projects/${projectId}/gallery/${crypto.randomUUID()}-${sanitizeFilename(file.name)}`;
          await env.MY_BUCKET.put(galleryKey, file.stream(), { 
            httpMetadata: { contentType: file.type } 
          });
          finalGalleryUrls.push(`${baseUrl}/${galleryKey}`);
        }
      }

      // Only update gallery if there are new files OR if it's an edit and we have existing files data
      if (id || galleryFiles.length > 0) {
        await env.DB.prepare("UPDATE projects SET gallery_images = ? WHERE id = ?")
          .bind(JSON.stringify(finalGalleryUrls), projectId).run();
      }

      return new Response(JSON.stringify({ success: true, id: projectId }), { 
        headers: corsHeaders 
      });

    } catch (dbErr) {
      return new Response(JSON.stringify({ error: dbErr.message }), { 
        status: 500, 
        headers: corsHeaders 
      });
    }
  }

  // --- DELETE PROJECT ---
  if (method === "DELETE") {
    const id = url.searchParams.get("id");
    if (!id) return new Response("Missing ID", { status: 400, headers: corsHeaders });

    // 1. Fetch current image paths to clean up R2
    const project = await env.DB.prepare(
      "SELECT primary_image, gallery_images FROM projects WHERE id = ?"
    ).bind(id).first();

    if (project) {
      // Delete Feature Image from R2
      if (project.primary_image) {
        let featKey = project.primary_image;
        if (featKey.includes("projects/")) featKey = featKey.substring(featKey.indexOf("projects/"));
        if (featKey) await env.MY_BUCKET.delete(featKey);
      }

      // Delete Gallery Images from R2
      if (project.gallery_images) {
        try {
          const images = JSON.parse(project.gallery_images);
          for (const imgUrl of images) {
            let galKey = imgUrl;
            if (galKey.includes("projects/")) galKey = galKey.substring(galKey.indexOf("projects/"));
            if (galKey) await env.MY_BUCKET.delete(galKey);
          }
        } catch (e) { console.error("JSON parse error on delete", e); }
      }
    }

    // 2. Delete the database record
    await env.DB.prepare("DELETE FROM projects WHERE id = ?").bind(id).run();
    
    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
  }
}

      // ---------------------------------------------------------
      // 3. VENDORS (CRUD + R2)
      // ---------------------------------------------------------
      if (url.pathname.startsWith("/api/vendors")) {
        if (method === "POST") {
          const formData = await request.formData();
          const id = formData.get("id");
          const name = formData.get("name");
          const material = formData.get("material");
          const logoFile = formData.get("logo");

          let vId = id;
          let oldLogoUrl = null;
          if (id) {
            const existing = await env.DB.prepare("SELECT logo_url FROM vendors WHERE id=?").bind(id).first();
            oldLogoUrl = existing?.logo_url;
            await env.DB.prepare("UPDATE vendors SET name=?, material=? WHERE id=?").bind(name, material, id).run();
          } else {
            const { results } = await env.DB.prepare("INSERT INTO vendors (name, material) VALUES (?, ?) RETURNING id").bind(name, material).run();
            vId = results[0].id;
          }

          if (logoFile && logoFile.size > 0) {
            if (oldLogoUrl) {
                let key = oldLogoUrl;
                if (key.includes("vendors/")) key = key.substring(key.indexOf("vendors/"));
                await env.MY_BUCKET.delete(key);
            }
            const fileName = `vendors/${vId}/${crypto.randomUUID()}-${sanitizeFilename(logoFile.name)}`;
            await env.MY_BUCKET.put(fileName, logoFile.stream(), { httpMetadata: { contentType: logoFile.type } });
            const logoUrl = `${baseUrl}/${fileName}`;
            await env.DB.prepare("UPDATE vendors SET logo_url = ? WHERE id = ?").bind(logoUrl, vId).run();
          } else if (id && formData.get("remove_logo") === "true") {
            if (oldLogoUrl) {
                let key = oldLogoUrl;
                if (key.includes("vendors/")) key = key.substring(key.indexOf("vendors/"));
                await env.MY_BUCKET.delete(key);
            }
            await env.DB.prepare("UPDATE vendors SET logo_url = NULL WHERE id = ?").bind(vId).run();
          }
          return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
        }

        if (method === "DELETE") {
          const id = url.searchParams.get("id");
          const vendor = await env.DB.prepare("SELECT logo_url FROM vendors WHERE id = ?").bind(id).first();
          if (vendor?.logo_url) {
            let key = vendor.logo_url;
            if (key.includes("vendors/")) key = key.substring(key.indexOf("vendors/"));
            await env.MY_BUCKET.delete(key);
          }
          await env.DB.prepare("DELETE FROM vendors WHERE id = ?").bind(id).run();
          return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
        }
      }

      // ---------------------------------------------------------
      // 4. ABOUT & CONTACT (Update Only)
      // ---------------------------------------------------------
      if (url.pathname === "/api/about" && method === "POST") {
        const data = await request.json();
        await env.DB.prepare("UPDATE company_info SET story=?, years_experience=?, completed_projects=? WHERE id=1")
          .bind(data.story, data.years_experience, data.completed_projects).run();
        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
      }

      if (url.pathname === "/api/contact" && method === "POST") {
        const data = await request.json();
        await env.DB.prepare("UPDATE contact_settings SET email=?, phone=?, address=? WHERE id=1")
          .bind(data.email, data.phone, data.address).run();
        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
      }

      // ---------------------------------------------------------
      // 5. GET ALL DATA
      // ---------------------------------------------------------
      if (url.pathname === "/api/all" && method === "GET") {
        const projects = await env.DB.prepare("SELECT * FROM projects").all();
        const vendors = await env.DB.prepare("SELECT * FROM vendors").all();
        const sectors = await env.DB.prepare("SELECT * FROM sectors").all();
        const finishes = await env.DB.prepare("SELECT * FROM finishes").all();
        const about = await env.DB.prepare("SELECT * FROM company_info WHERE id=1").first();
        const contact = await env.DB.prepare("SELECT * FROM contact_settings WHERE id=1").first();

        return new Response(JSON.stringify({
          projects: projects.results,
          vendors: vendors.results,
          sectors: sectors.results,
          finishes: finishes.results,
          about,
          contact
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
    }

    return new Response("Not Found", { status: 404 });
  }
};