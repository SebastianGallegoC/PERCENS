import { createRoot } from "react-dom/client";
import { act } from "react";
import { useForm } from "react-hook-form";
import { describe, expect, it } from "vitest";

import { SearchableSelect } from "@/components/form/SearchableSelect";
import type { FormValues } from "@/types/formFields";

const OPTIONS = [
  { value: "", label: "" },
  { value: "CUMPLE", label: "CUMPLE" },
  { value: "NO CUMPLE", label: "NO CUMPLE" },
];

const PTR = { bubbles: true, cancelable: true, pointerId: 1, clientX: 10, clientY: 10 };

function tapListOption(option: HTMLLIElement) {
  option.dispatchEvent(new PointerEvent("pointerdown", PTR));
  option.dispatchEvent(new PointerEvent("pointerup", PTR));
}

function dragListOption(option: HTMLLIElement, clientY: number) {
  option.dispatchEvent(new PointerEvent("pointerdown", PTR));
  option.dispatchEvent(
    new PointerEvent("pointermove", { ...PTR, clientY }),
  );
  option.dispatchEvent(
    new PointerEvent("pointerup", { ...PTR, clientY }),
  );
}

function SelectHarness({
  onValue,
}: {
  onValue?: (v: string) => void;
}) {
  const { control, watch } = useForm<FormValues>({
    defaultValues: { resultado_validacion: "" } as FormValues,
  });
  const v = watch("resultado_validacion");
  if (onValue) {
    onValue(String(v ?? ""));
  }
  return (
    <SearchableSelect
      name="resultado_validacion"
      control={control}
      options={OPTIONS}
      label="Resultado"
    />
  );
}

describe("SearchableSelect", () => {
  it("aplica la opción al tap en la lista (sin revertir por blur)", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    let current = "";

    await act(async () => {
      root.render(
        <SelectHarness
          onValue={(v) => {
            current = v;
          }}
        />,
      );
    });

    const input = container.querySelector(
      'input[role="combobox"]',
    ) as HTMLInputElement;
    expect(input).toBeTruthy();

    await act(async () => {
      input.focus();
      input.value = "CUM";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("focus", { bubbles: true }));
    });

    const option = container.querySelector(
      'li[role="option"][aria-selected="false"]',
    ) as HTMLLIElement;
    expect(option?.textContent).toContain("CUMPLE");

    await act(async () => {
      tapListOption(option);
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 60));
    });

    expect(current).toBe("CUMPLE");
    expect(input.value).toBe("CUMPLE");

    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it("no enfoca el siguiente campo del formulario al elegir una opción", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <form>
          <SelectHarness />
          <input type="date" data-testid="siguiente" />
        </form>,
      );
    });

    const input = container.querySelector(
      'input[role="combobox"]',
    ) as HTMLInputElement;
    const trap = container.querySelector(
      'div[tabindex="-1"].sr-only',
    ) as HTMLDivElement;
    const next = container.querySelector(
      '[data-testid="siguiente"]',
    ) as HTMLInputElement;

    await act(async () => {
      input.focus();
      input.dispatchEvent(new Event("focus", { bubbles: true }));
    });

    const option = Array.from(
      container.querySelectorAll('li[role="option"]'),
    ).find((li) => li.textContent?.includes("CUMPLE")) as HTMLLIElement;

    await act(async () => {
      tapListOption(option);
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 60));
    });

    expect(document.activeElement).not.toBe(input);
    expect(document.activeElement).not.toBe(next);
    expect(document.activeElement).toBe(trap);

    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it("no aplica opción al arrastrar/scroll en la lista (solo al soltar un tap)", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    let current = "";

    await act(async () => {
      root.render(
        <SelectHarness
          onValue={(v) => {
            current = v;
          }}
        />,
      );
    });

    const input = container.querySelector(
      'input[role="combobox"]',
    ) as HTMLInputElement;

    await act(async () => {
      input.focus();
      input.dispatchEvent(new Event("focus", { bubbles: true }));
    });

    const option = container.querySelector(
      'li[role="option"][aria-selected="false"]',
    ) as HTMLLIElement;

    await act(async () => {
      dragListOption(option, 80);
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 60));
    });

    expect(current).toBe("");

    act(() => {
      root.unmount();
    });
    container.remove();
  });
});
