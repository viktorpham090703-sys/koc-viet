import { useEffect, useRef } from "react";

export function RecruitLanding() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    import("../../onboard.js").then(({ renderOnboarding }) => {
      if (active && containerRef.current) {
        renderOnboarding(containerRef.current, { cancelHash: "#/dang-ky" });
      }
    });
    return () => {
      active = false;
    };
  }, []);

  return <div ref={containerRef} style={{ minHeight: "100vh", background: "#fff" }} />;
}

