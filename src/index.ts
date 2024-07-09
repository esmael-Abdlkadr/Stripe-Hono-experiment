import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import "dotenv/config";

import Stripe from "stripe";
import { HTTPException } from "hono/http-exception";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const app = new Hono();
app.use("/*", cors());
app.use(logger());

app.get("/", (c) => {
  const html = `
  <!DOCTYPE html>
  <html>
    <head>
      <title>Checkout</title>
      <script src="https://js.stripe.com/v3/"></script>
    </head>
    <body>
      <h1>Checkout</h1>
      <button id="checkoutButton">Checkout</button>

      <script>
        const checkoutButton = document.getElementById('checkoutButton');
        checkoutButton.addEventListener('click', async () => {
          const response = await fetch('/checkout', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          const { id } = await response.json();
          const stripe = Stripe('${process.env.STRIPE_PUBLISHABLE_KEY}');
          await stripe.redirectToCheckout({ sessionId: id });
        });
      </script>
    </body>
  </html>
`;
  return c.html(html);
});

app.post("/checkout", async (c) => {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: "price_1PabmcJrHPgj3GcgIN0eensB",
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `http://localhost:3000/success`,
      cancel_url: `http://localhost:3000/cancel`,
    });
    return c.json(session);
  } catch (err: any) {
    console.log(err);
    throw new HTTPException(500, { message: err.message });
  }
});
import { Next } from "hono";

app.get("/success", (c) => {
  return c.text("Success!");
});

app.get("/cancel", (c) => {
  return c.text("Hello Hono!");
});

// webb-hhok.
app.post("/webhook", async (c) => {
  const rawBody = await c.req.text();
  const signature = await c.req.header("stripe-signature");
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature!,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.log(`weebhook verification failed ${err.message}`);
    throw new HTTPException(400, { message: err.message });
  }
  // Handle the event
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    console.log(session);
  }
  if (event.type === "checkout.session.expired") {
    const session = event.data.object;
    console.log(session);
  }
  return c.text("sucess");
});

const port = 3000;
console.log(`Server is running on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});
