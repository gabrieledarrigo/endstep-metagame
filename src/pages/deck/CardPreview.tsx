import { type RefObject, useLayoutEffect, useRef, useState } from "react";
import { placeCardPreview } from "../../helpers";
import "./CardPreview.css";

type CardPreviewProps = {
  imageUrl: string;
  name: HTMLElement;
  panel: RefObject<HTMLElement | null>;
  onHide: () => void;
};

export function CardPreview({
  imageUrl,
  name,
  panel,
  onHide,
}: CardPreviewProps) {
  const [loaded, setLoaded] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const preview = root.current;

    if (preview === null) {
      return;
    }

    preview.showPopover();

    return (): void => {
      preview.hidePopover();
    };
  }, []);

  useLayoutEffect(() => {
    const preview = root.current;
    const box = panel.current;

    if (preview === null || box === null) {
      return;
    }

    let placed = false;

    const place = (): void => {
      const spot = placeCardPreview(
        name.getBoundingClientRect(),
        box.getBoundingClientRect(),
        {
          width: document.documentElement.clientWidth,
          height: document.documentElement.clientHeight,
        },
      );

      if (spot === null && placed) {
        onHide();
        return;
      }

      if (spot === null) {
        preview.style.visibility = "hidden";
        return;
      }

      placed = true;
      preview.style.visibility = "";
      preview.style.left = `${spot.left}px`;
      preview.style.top = `${spot.top}px`;
    };

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        onHide();
      }
    };

    place();
    const frame = requestAnimationFrame(place);
    window.addEventListener("scroll", place, { capture: true, passive: true });
    window.addEventListener("resize", place);
    document.addEventListener("keydown", onKeyDown);

    return (): void => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", place, { capture: true });
      window.removeEventListener("resize", place);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [name, panel, onHide]);

  return (
    <div
      ref={root}
      className={loaded ? "card-preview" : "card-preview card-preview--loading"}
      popover="manual"
      aria-hidden="true"
    >
      <img
        className="card-preview__img"
        src={imageUrl}
        alt=""
        width={488}
        height={680}
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
}
