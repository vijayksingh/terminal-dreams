import { PrinciplesLanding } from "@/components/principles/PrinciplesLanding";
import { getKnowledgeGraphData } from "@/lib/principles";
import { CATEGORIES, LEARNING_PATHS } from "@/lib/principle-data";

export default async function PrinciplesLandingPage() {
  const graphData = await getKnowledgeGraphData();

  return (
    <PrinciplesLanding
      graphData={graphData}
      learningPaths={LEARNING_PATHS}
      categories={CATEGORIES}
    />
  );
}
