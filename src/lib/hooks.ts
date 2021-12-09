import type { Nft, targetNftT } from "../types";

import * as abis from "./abis";
import {
  ChainId,
  ERC20Interface,
  useContractCalls,
  useContractFunction,
  useEthers,
} from "@yuyao17/corefork";
import { BigNumber, Contract } from "ethers";
import { Contracts } from "../const";
import { Interface } from "@ethersproject/abi";
import { generateIpfsLink } from "../utils";
import { toast } from "react-hot-toast";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "react-query";
import { MaxUint256 } from "@ethersproject/constants";
import plur from "plur";
import { TokenStandard } from "../../generated/graphql";

type WebhookBody = {
  address: string;
  collection: string;
  expires?: number;
  image: string;
  tokenId: string;
  name: string;
  price: string;
  quantity: number;
  updates?: Pick<WebhookBody, "expires" | "price" | "quantity">;
  user: string;
};

function callWebhook(
  type: "list" | "sold" | "update",
  { image, ...body }: WebhookBody
) {
  fetch(`/api/webhook/${type}`, {
    method: "post",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      ...body,
      image: image.replace(/ /g, "%20"),
    }),
  });
}

export function useChainId() {
  const { chainId } = useEthers();

  switch (chainId) {
    case ChainId.Arbitrum:
    case ChainId.Rinkeby:
      return chainId;
    default:
      return ChainId.Arbitrum;
  }
}

export function useTransferNFT(contract: string, standard: TokenStandard) {
  const isERC721 = standard === TokenStandard.Erc721;

  const transfer = useContractFunction(
    new Contract(contract, isERC721 ? abis.erc721 : abis.erc1155),
    isERC721 ? "safeTransferFrom(address,address,uint256)" : "safeTransferFrom"
  );

  useEffect(() => {
    switch (transfer.state.status) {
      case "Exception":
      case "Fail":
        toast.error(
          `An error occurred while trying to transfer: ${contract}\n${transfer.state.errorMessage} `
        );
      case "Success":
        toast.success(`Successfully transferred!`);
    }
  }, [transfer.state, contract]);

  return transfer;
}

export function useApproveContract(contract: string, standard: TokenStandard) {
  const chainId = useChainId();

  const approve = useContractFunction(
    new Contract(
      contract,
      standard === TokenStandard.Erc721 ? abis.erc721 : abis.erc1155
    ),
    "setApprovalForAll"
  );

  useEffect(() => {
    switch (approve.state.status) {
      case "Exception":
      case "Fail":
        toast.error(
          `An error occurred while trying set approval on the contract: ${contract}\n${approve.state.errorMessage} `
        );
    }
  }, [approve.state, contract]);

  return useMemo(() => {
    const send = () => approve.send(Contracts[chainId].marketplace, true);

    return { ...approve, send };
  }, [approve, chainId]);
}

export function useContractApprovals(
  collections: Array<{ address: string; standard: TokenStandard }>
) {
  const { account } = useEthers();
  const chainId = useChainId();

  const approvals = useContractCalls(
    collections.map(({ address, standard }) => ({
      abi: new Interface(standard === "ERC721" ? abis.erc721 : abis.erc1155),
      address,
      method: "isApprovedForAll",
      args: [account, Contracts[chainId].marketplace],
    })) ?? []
  );

  return approvals
    .filter(Boolean)
    .flat()
    .reduce<Record<string, boolean>>((acc, value, index) => {
      const { address } = collections[index];

      if (address) {
        acc[address] = value;
      }

      return acc;
    }, {});
}

export function useCreateListing() {
  const [{ nft: { name = "" } = {}, quantity }, setInfo] = useState<{
    nft?: Nft;
    quantity: number;
  }>({
    quantity: 0,
  });
  const { account } = useEthers();
  const queryClient = useQueryClient();
  const chainId = useChainId();
  const webhook = useRef<() => void>();

  const sell = useContractFunction(
    new Contract(Contracts[chainId].marketplace, abis.marketplace),
    "createListing"
  );

  useEffect(() => {
    switch (sell.state.status) {
      case "Exception":
      case "Fail":
        if (sell.state.errorMessage?.includes("already listed")) {
          toast.error(
            "Your item is already listed, please update your listing."
          );

          break;
        }

        toast.error(`Transaction failed! ${sell.state.errorMessage}`);

        return;
      case "Success":
        toast.success(
          `Successfully listed ${quantity} ${plur(name, quantity)} for sale!`
        );

        queryClient.invalidateQueries("inventory", { refetchInactive: true });

        webhook.current?.();
        webhook.current = undefined;

        break;
    }
  }, [name, quantity, queryClient, sell.state.errorMessage, sell.state.status]);

  return useMemo(() => {
    const send = (
      nft: Nft,
      address: string,
      tokenId: number,
      quantity: number,
      price: BigNumber,
      expires: number
    ) => {
      setInfo({ nft, quantity });
      sell.send(address, tokenId, quantity, price, expires);

      webhook.current = () => {
        const { collection, name, source } = nft;

        callWebhook("list", {
          address,
          collection,
          expires,
          tokenId: nft.tokenId,
          image: source,
          name,
          price: price.toString(),
          quantity,
          user: String(account),
        });
      };
    };

    return { ...sell, send };
  }, [account, sell]);
}

export function useRemoveListing() {
  const [name, setName] = useState("");
  const queryClient = useQueryClient();
  const chainId = useChainId();

  const remove = useContractFunction(
    new Contract(Contracts[chainId].marketplace, abis.marketplace),
    "cancelListing"
  );

  useEffect(() => {
    switch (remove.state.status) {
      case "Exception":
      case "Fail":
        if (remove.state.errorMessage?.includes("not listed item")) {
          toast.error("You do not have that item listed.");

          break;
        }

        toast.error(`Transaction failed! ${remove.state.errorMessage}`);

        return;
      case "Success":
        toast.success(`Successfully removed the listing for ${name}!`);

        queryClient.invalidateQueries("inventory", { refetchInactive: true });

        break;
    }
  }, [remove.state.errorMessage, remove.state.status, name, queryClient]);

  return useMemo(() => {
    const send = (name: string, address: string, tokenId: number) => {
      setName(name);

      remove.send(address, tokenId);
    };

    return { ...remove, send };
  }, [remove]);
}

export function useBuyItem() {
  const queryClient = useQueryClient();
  const chainId = useChainId();
  const { account } = useEthers();
  const webhook = useRef<() => void>();

  const { send: sendBuy, state } = useContractFunction(
    new Contract(Contracts[chainId].marketplace, abis.marketplace),
    "buyItem"
  );

  useEffect(() => {
    switch (state.status) {
      case "Exception":
      case "Fail":
        toast.error(`Transaction failed! ${state.errorMessage}`);
        return;
      case "Success":
        toast.success("Successfully purchased!");

        queryClient.invalidateQueries();

        webhook.current?.();
        webhook.current = undefined;

        break;
    }
  }, [queryClient, state.errorMessage, state.status]);

  return useMemo(() => {
    const send = (
      nft: targetNftT,
      address: string,
      ownerAddress: string,
      tokenId: number,
      quantity: number
    ) => {
      sendBuy(address, tokenId, ownerAddress, quantity);

      webhook.current = () => {
        const { metadata, payload } = nft;

        callWebhook("sold", {
          address,
          collection: metadata?.description ?? "",
          image: metadata?.image?.includes("ipfs")
            ? generateIpfsLink(metadata.image)
            : metadata?.image ?? "",
          name: `${metadata?.description ?? ""} ${metadata?.name ?? ""}`,
          tokenId: payload.tokenId,
          price: payload.pricePerItem.toString(),
          quantity,
          user: String(account),
        });
      };
    };

    return { send, state };
  }, [account, sendBuy, state]);
}

export function useUpdateListing() {
  const [{ nft: { name = "" } = {}, quantity }, setInfo] = useState<{
    nft?: Nft;
    quantity: number;
  }>({
    quantity: 0,
  });
  const { account } = useEthers();
  const queryClient = useQueryClient();
  const chainId = useChainId();
  const webhook = useRef<() => void>();

  const update = useContractFunction(
    new Contract(Contracts[chainId].marketplace, abis.marketplace),
    "updateListing"
  );

  useEffect(() => {
    switch (update.state.status) {
      case "Exception":
      case "Fail":
        if (update.state.errorMessage?.includes("not listed item")) {
          toast.error("You do not have that item listed.");

          break;
        }

        toast.error(`Transaction failed! ${update.state.errorMessage}`);

        return;
      case "Success":
        toast.success(
          `Successfully listed ${quantity} ${plur(name, quantity)} for sale!`
        );

        queryClient.invalidateQueries("inventory", { refetchInactive: true });

        webhook.current?.();
        webhook.current = undefined;

        break;
    }
  }, [
    name,
    quantity,
    queryClient,
    update.state.errorMessage,
    update.state.status,
  ]);

  return useMemo(() => {
    const send = (
      nft: Nft,
      address: string,
      tokenId: number,
      quantity: number,
      price: BigNumber,
      expires: number
    ) => {
      setInfo({ nft, quantity });
      update.send(address, tokenId, quantity, price, expires);

      webhook.current = () => {
        const { collection, listing, name, source, tokenId } = nft;

        callWebhook("update", {
          address,
          collection,
          tokenId,
          expires: Number(listing?.expires ?? 0),
          image: source,
          name,
          price: listing?.pricePerItem.toString() ?? "",
          quantity: Number(listing?.quantity ?? 0),
          updates: {
            quantity,
            price: price.toString(),
            expires,
          },
          user: String(account),
        });
      };
    };

    return { ...update, send };
  }, [account, update]);
}

export const useApproveMagic = () => {
  const chainId = useChainId();
  const contract = new Contract(Contracts[chainId].magic, ERC20Interface);
  const { send, state } = useContractFunction(contract, "approve");

  return {
    send: () => send(Contracts[chainId].marketplace, MaxUint256.toString()),
    state,
  };
};
