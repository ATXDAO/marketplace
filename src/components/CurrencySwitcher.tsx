import * as React from "react";
import { useMagic } from "../context/magicContext";
import { formatNumber } from "../utils";
import { EthIcon, SwapIcon, UsdIcon } from "./Icons";

export const CurrencySwitcher = ({ price }: { price: number }) => {
  const [currency, setCurrency] = React.useState<"eth" | "usd">("eth");
  const isEth = currency === "eth";
  const { ethPrice, usdPrice } = useMagic();

  return (
    <div className="items-center inline-flex">
      {!isEth && "$ "}
      {formatNumber(price * parseFloat(isEth ? ethPrice : usdPrice))}
      {isEth && " ETH"}
      <button
        className="flex ml-2 dark:text-gray-200 text-gray-500"
        onClick={() => setCurrency(isEth ? "usd" : "eth")}
      >
        <SwapIcon className="h-4 w-4" />
        {isEth ? (
          <UsdIcon className="h-4 w-4" />
        ) : (
          <EthIcon className="h-4 w-4" />
        )}
      </button>
    </div>
  );
};
