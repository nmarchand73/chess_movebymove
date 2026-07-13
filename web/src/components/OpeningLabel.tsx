import { formatOpeningTooltip, getOpeningTooltip } from "../lib/openingTooltips";

type Props = {
  name: string;
  eco?: string;
  showEco?: boolean;
  showTip?: boolean;
};

export function OpeningLabel({ name, eco, showEco = true, showTip = true }: Props) {
  const tip = showTip ? getOpeningTooltip(name) : undefined;
  const tipText = tip ? formatOpeningTooltip(name, tip) : undefined;

  return (
    <span className="opening-label">
      <span className={`opening-name${tip ? " opening-tip" : ""}`} data-tip={tipText}>
        {name}
      </span>
      {showEco && eco && <span className="eco-badge">{eco}</span>}
    </span>
  );
}
