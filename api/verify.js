import Stripe from "stripe";
import { kv } from "@vercel/kv";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {

const { session_id } = req.query;

const session = await stripe.checkout.sessions.retrieve(session_id);

if (session.payment_status !== "paid") {
return res.status(403).send("Plata nu este confirmată");
}

const token = crypto.randomUUID();

await kv.set(token, {
used: false,
file: "trilogie"
});

res.redirect(/success.html?token=${token});

}
