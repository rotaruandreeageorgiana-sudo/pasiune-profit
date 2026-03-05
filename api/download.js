import { kv } from "@vercel/kv";

export default async function handler(req, res) {

const { token } = req.query;

const data = await kv.get(token);

if (!data) {
return res.status(403).send("Link invalid");
}

if (data.used) {
return res.status(403).send("Link deja folosit");
}

await kv.set(token, { ...data, used: true });

if(data.file === "trilogie"){
return res.redirect("/download-trilogie.html");
}

}
