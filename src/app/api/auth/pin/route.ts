export async function POST(req: Request) {
  const { pin } = await req.json().catch(() => ({ pin: "" }));
  const correctPin = process.env.SALESHELPER_PIN;
  const secret = process.env.SALESHELPER_SECRET;

  if (!correctPin || !secret) {
    return Response.json({ ok: false, error: "No configurado" }, { status: 500 });
  }

  if (pin !== correctPin) {
    return Response.json({ ok: false }, { status: 401 });
  }

  const token = secret + "_ok";
  const maxAge = 7 * 24 * 60 * 60; // 7 días

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": `sh_auth=${token}; Path=/; HttpOnly; Max-Age=${maxAge}; SameSite=Lax`,
    },
  });
}
