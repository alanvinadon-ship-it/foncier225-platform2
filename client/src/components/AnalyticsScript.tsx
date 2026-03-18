import { useEffect } from "react";

const ANALYTICS_SCRIPT_ID = "foncier225-analytics";

function normalizeEndpoint(endpoint: string) {
  return endpoint.replace(/\/+$/, "");
}

export default function AnalyticsScript() {
  useEffect(() => {
    const endpoint = import.meta.env.VITE_ANALYTICS_ENDPOINT?.trim();
    const websiteId = import.meta.env.VITE_ANALYTICS_WEBSITE_ID?.trim();

    if (!endpoint || !websiteId) {
      return;
    }

    if (document.getElementById(ANALYTICS_SCRIPT_ID)) {
      return;
    }

    const script = document.createElement("script");
    script.id = ANALYTICS_SCRIPT_ID;
    script.defer = true;
    script.src = `${normalizeEndpoint(endpoint)}/umami`;
    script.dataset.websiteId = websiteId;
    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, []);

  return null;
}
