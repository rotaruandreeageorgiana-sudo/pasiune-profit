import { kv } from "@vercel/kv";

export default async function handler(req,res){

const { token } = req.query;

const data = await kv.get(token);

if(!data){
return res.status(403).send("Link invalid");
}

if(data.used){
return res.status(403).send("Link deja folosit");
}

await kv.set(token,{...data,used:true});

if(data.file==="vol1"){
return res.redirect("/De%20la%20Idee%20la%20Oferta%20Clara.pdf");
}

if(data.file==="vol2"){
return res.redirect("/DePasiunelaProfit%20Vol2.pdf");
}

if(data.file==="vol3"){
return res.redirect("/DePasiunelaProfit%20Vol3%20Conversie.pdf");
}

if(data.file==="trilogie"){
return res.redirect("/download-trilogie.html");
}

}
