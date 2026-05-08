import { Hono } from "hono";
import prisma from "./db";

const app = new Hono();

app.get("/mitglieder", async (c) => {
  const mitglieder = await prisma.mitglied.findMany({
    include: {
      ausweis: true,
      ausleihen: true,
    },
  });
  return c.json(mitglieder);
});

export default app;