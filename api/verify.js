import Stripe from "stripe";
import { kv } from "@vercel/kv";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {

const { session_id } = req.query;

const session = await stripe.checkout.sessions.retrieve(session_id, {
expand: ["line_items"]
});

if (session.payment_status !== "paid") {
return res.status(403).send("Plata nu este confirmată");
}

const product = session.line_items.data[0].description;

let file = "";

if(product.includes("Volumul 1")){
file = "vol1";
}

if(product.includes("Volumul 2")){
file = "vol2";
}

if(product.includes("Volumul 3")){
file = "vol3";
}

if(product.includes("Trilogie")){
file = "trilogie";
}

const token = crypto.randomUUID();

await kv.set(token, {
used:false,
file:file
});

res.redirect(/success.html?token=${token});

}
