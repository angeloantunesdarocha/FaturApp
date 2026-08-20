import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "FaturApp — descubra quanto realmente sobra";
export const contentType = "image/png";
export const size = {
  width: 1200,
  height: 630,
};

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 78px",
          background:
            "linear-gradient(135deg, #071d33 0%, #123b63 58%, #1d5b84 100%)",
          color: "#ffffff",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 20,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#ffffff",
              color: "#123b63",
              fontSize: 42,
              fontWeight: 800,
            }}
          >
            F
          </div>
          <div style={{ fontSize: 42, fontWeight: 800, letterSpacing: -1 }}>
            FaturApp
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              color: "#7ee7c5",
              fontSize: 25,
              fontWeight: 700,
              letterSpacing: 1,
              textTransform: "uppercase",
            }}
          >
            Para motoristas de aplicativo
          </div>
          <div
            style={{
              maxWidth: 940,
              fontSize: 66,
              lineHeight: 1.05,
              fontWeight: 800,
              letterSpacing: -2,
            }}
          >
            Descubra quanto realmente sobra.
          </div>
          <div
            style={{
              maxWidth: 800,
              color: "#d9e8f2",
              fontSize: 29,
              lineHeight: 1.25,
            }}
          >
            Calcule seu lucro líquido por dia, por km e por hora — com taxas,
            combustível e manutenção descontados.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid rgba(255,255,255,.25)",
            paddingTop: 24,
            color: "#ffffff",
            fontSize: 24,
          }}
        >
          <span>Você está lucrando ou pagando para trabalhar?</span>
          <span style={{ color: "#7ee7c5", fontWeight: 700 }}>
            fatur-app.vercel.app
          </span>
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
