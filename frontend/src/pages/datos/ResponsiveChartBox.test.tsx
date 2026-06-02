// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ResponsiveChartBox } from "@/pages/datos/ResponsiveChartBox";

describe("ResponsiveChartBox", () => {
  it("renderiza el gráfico cuando el contenedor tiene dimensiones", async () => {
    render(
      <ResponsiveChartBox className="h-64">
        {() => <div data-testid="chart">ok</div>}
      </ResponsiveChartBox>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("chart")).toBeInTheDocument();
    });
  });
});
