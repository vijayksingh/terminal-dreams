import { FrontendDesignLanding } from "@/components/frontend-design/FrontendDesignLanding";
import { getMetroMapData } from "@/lib/frontend-design";

export default async function FrontendDesignPage() {
  const mapData = await getMetroMapData();

  return <FrontendDesignLanding mapData={mapData} />;
}
