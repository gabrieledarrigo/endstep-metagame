import { useLayoutEffect, useRef, useState } from "react";
import { Button } from "../../components/Button";
import "./CardSheet.css";

type CardSheetProps = {
  name: string;
  imageUrl: string;
  onClose: () => void;
};

export function CardSheet({ name, imageUrl, onClose }: CardSheetProps) {
  const [failed, setFailed] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);

  useLayoutEffect(() => {
    if (dialog.current !== null && !dialog.current.open) {
      dialog.current.showModal();
    }
  }, []);

  return (
    <dialog
      ref={dialog}
      className="card-sheet"
      aria-label={name}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          event.currentTarget.close();
        }
      }}
    >
      <div className="card-sheet__box">
        {failed ? (
          <p className="card-sheet__error">
            {"The card's image could not be loaded."}
          </p>
        ) : (
          <img
            className="card-sheet__img"
            src={imageUrl}
            alt={name}
            width={488}
            height={680}
            onError={() => setFailed(true)}
          />
        )}
        <Button
          variant="secondary"
          autoFocus
          onClick={() => dialog.current?.close()}
        >
          Close
        </Button>
      </div>
    </dialog>
  );
}
