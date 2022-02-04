import Router, { useRouter } from "next/router";
import React, { Fragment, useEffect, useState } from "react";
import { Dialog, Disclosure, Menu, Transition } from "@headlessui/react";
import {
  ChevronDownIcon,
  FilterIcon,
  MinusSmIcon,
  PlusSmIcon,
  XIcon,
} from "@heroicons/react/solid";

import { useInfiniteQuery, useQuery } from "react-query";
import { bridgeworld, client, marketplace } from "../../../lib/client";
import { AddressZero, Zero } from "@ethersproject/constants";
import { CenterLoadingDots } from "../../../components/CenterLoadingDots";
import {
  abbreviatePrice,
  formatNumber,
  formatPercent,
  formatPrice,
  getCollectionNameFromAddress,
  slugToAddress,
} from "../../../utils";
import { formatEther } from "ethers/lib/utils";
import ImageWrapper from "../../../components/ImageWrapper";
import Link from "next/link";
import { Modal } from "../../../components/Modal";
import { GetCollectionAttributesQuery } from "../../../../generated/queries.graphql";
import {
  GetCollectionListingsQuery,
  Listing_OrderBy,
  OrderDirection,
  TokenStandard,
} from "../../../../generated/marketplace.graphql";
import classNames from "clsx";
import { useInView } from "react-intersection-observer";
import { SearchAutocomplete } from "../../../components/SearchAutocomplete";
import { Item } from "react-stately";
import Listings from "../../../components/Listings";
import Button from "../../../components/Button";
import { useChainId } from "../../../lib/hooks";
import { EthIcon, MagicIcon, SwapIcon } from "../../../components/Icons";
import { useMagic } from "../../../context/magicContext";
import { ChainId } from "@yuyao17/corefork";

const MAX_ITEMS_PER_PAGE = 42;

const generateDescription = (cotract: string, chainId: ChainId) => {
  const collectionName = getCollectionNameFromAddress(cotract, chainId);

  switch (collectionName) {
    case "Legacy Legions Genesis":
    case "Legacy Legions":
      return (
        <p className="text-gray-500 dark:text-gray-400 text-[0.5rem] sm:text-sm mt-4 sm:mt-6">
          Legacy Legions need to undergo{" "}
          <a
            href="https://bridgeworld.treasure.lol/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Pilgrimage
          </a>{" "}
          to participate in Bridgeworld.
        </p>
      );
    default:
      return "";
  }
};

const tabs = [
  { name: "Collection", value: "collection" },
  { name: "Activity", value: "activity" },
];

function QueryLink(props: any) {
  const { href, children, ...rest } = props;
  return (
    <Link href={href}>
      <a {...rest}>{children}</a>
    </Link>
  );
}

const sortOptions = [
  { name: "Price: Low to High", value: "asc" },
  { name: "Price: High to Low", value: "desc" },
  { name: "Latest", value: "latest" },
];

function assertUnreachable(): never {
  throw new Error("Didn't expect to get here");
}

const MapSortToOrder = (sort: string) => {
  if (sort === "latest") {
    return Listing_OrderBy.blockTimestamp;
  }

  return Listing_OrderBy.pricePerItem;
};

const MapSortToEnum = (sort: string) => {
  switch (sort) {
    case "asc":
      return OrderDirection.asc;
    case "desc":
    case "latest":
      return OrderDirection.desc;
  }
  return assertUnreachable();
};

const getTotalQuantity = (
  listings: NonNullable<
    NonNullable<GetCollectionListingsQuery>["tokens"]
  >[number]["listings"]
) => {
  return listings && listings.length > 0
    ? listings.reduce<number>(
        (acc, listing) => acc + Number(listing.quantity),
        0
      )
    : 0;
};

const reduceAttributes = (
  attributes: NonNullable<
    GetCollectionAttributesQuery["collection"]
  >["attributes"]
): {
  [key: string]: { value: string; percentage: string }[];
} | null => {
  return attributes && attributes.length > 0
    ? attributes.reduce<{
        [key: string]: { value: string; percentage: string }[];
      }>((acc, attribute) => {
        if (!acc[attribute.name]) {
          acc[attribute.name] = [
            {
              value: attribute.value,
              percentage: attribute.percentage,
            },
          ];
          return acc;
        }
        acc[attribute.name] = [
          ...acc[attribute.name],
          {
            value: attribute.value,
            percentage: attribute.percentage,
          },
        ];
        return acc;
      }, {})
    : null;
};

const formatSearchFilter = (search: string | undefined) => {
  if (!search) return [];

  const searchParams = Array.from(new URLSearchParams(search).entries());

  /*
    if searchParams is like this: [["Background", "red,blue"], ["Color", "green"]]
    return an array like this: ["Background,red", "Background,blue"]
  */
  return searchParams.reduce<string[]>((acc, [key, value]) => {
    const values = value.split(",");
    return [...acc, ...values.map((v) => `${key},${v}`)];
  }, []);
};

const getInititalFilters = (search: string | undefined) => {
  if (!search) return {};
  const searchParams = Array.from(new URLSearchParams(search).entries());

  /*
    if searchParams is like this: Background=alley
    return an object like this: {
      Background: ["alley"]
    }
    if searchParams is undefined, return an empty object
  */
  return searchParams.reduce<{ [key: string]: string[] }>(
    (acc, [key, value]) => {
      if (!acc[key]) {
        acc[key] = [value];
        return acc;
      }
      acc[key] = [...acc[key], value];
      return acc;
    },
    {}
  );
};
/*

*/

const createFilter = (
  base: string | undefined,
  search: {
    key: string;
    value: string;
  }
) => {
  const searchParams = Array.from(new URLSearchParams(base).entries());

  const combined = searchParams.reduce<{ [key: string]: string[] }>(
    (acc, [key, value]) => {
      if (!acc[key]) {
        acc[key] = [value];
        return acc;
      }
      acc[key] = [...acc[key], value];
      return acc;
    },
    {}
  );
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  return new URLSearchParams({
    ...combined,
    [search.key]: [...(combined?.[search.key] ?? []), search.value],
  }).toString();
};

const removeFilter = (
  base: string | undefined,
  search: { key: string; value: string }
) => {
  const searchParams = Array.from(new URLSearchParams(base).entries());

  const combined = searchParams.reduce<{ [key: string]: string[] }>(
    (acc, [key, value]) => {
      if (!acc[key]) {
        acc[key] = [value];
        return acc;
      }
      acc[key] = [...acc[key], value];
      return acc;
    },
    {}
  );

  const values = combined[search.key] ?? [];
  const filteredValues = values[0]
    ?.split(",")
    .filter((v) => v !== search.value);
  if (!filteredValues || filteredValues.length === 0) {
    delete combined[search.key];
  } else {
    combined[search.key] = [filteredValues.join(",")];
  }
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  return new URLSearchParams(combined).toString();
};

const Collection = () => {
  const router = useRouter();
  const {
    address: slugOrAddress,
    sort,
    tab,
    activitySort,
    search,
  } = router.query;
  const formattedSearch = Array.isArray(search) ? search[0] : search;
  const [searchToken, setSearchToken] = useState("");
  const [searchParams, setSearchParams] = useState("");
  const [isDetailedFloorPriceModalOpen, setDetailedFloorPriceModalOpen] =
    useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [floorCurrency, setFloorCurrency] = useState<"magic" | "eth">("magic");
  const filters = getInititalFilters(formattedSearch);
  const chainId = useChainId();
  const { ethPrice } = useMagic();

  const sortParam = sort ?? OrderDirection.asc;
  const activitySortParam = activitySort ?? "time";
  const formattedAddress = Array.isArray(slugOrAddress)
    ? slugToAddress(slugOrAddress[0], chainId)
    : slugToAddress(slugOrAddress?.toLowerCase() ?? AddressZero, chainId);

  const formattedTab = tab ? (Array.isArray(tab) ? tab[0] : tab) : "collection";

  const { data: activityData, isLoading: isActivityLoading } = useQuery(
    ["activity", { formattedAddress, activitySortParam }],
    () =>
      marketplace.getActivity({
        id: formattedAddress,
        orderBy:
          activitySortParam === "price"
            ? Listing_OrderBy.pricePerItem
            : Listing_OrderBy.blockTimestamp,
      }),
    {
      enabled: formattedTab === "activity",
    }
  );

  const { data: collectionData } = useQuery(
    ["collection-info", formattedAddress],
    () =>
      marketplace.getCollectionInfo({
        id: formattedAddress,
      }),
    {
      enabled: !!formattedAddress,
      refetchInterval: false,
    }
  );

  const { data: collectionAttributesData } = useQuery(
    ["collection-attributes", formattedAddress],
    () =>
      client.getCollectionAttributes({
        id: formattedAddress,
      }),
    {
      enabled: !!formattedAddress,
      refetchInterval: false,
    }
  );

  const attributeFilterList = reduceAttributes(
    collectionAttributesData?.collection?.attributes
  );

  const { data: statData } = useQuery(
    ["stats", formattedAddress],
    () =>
      marketplace.getCollectionStats({
        id: formattedAddress,
      }),
    {
      enabled: !!formattedAddress,
    }
  );

  React.useEffect(() => {
    const scrollToTop = () => {
      document.getElementById("filter-heading")?.scrollIntoView();
    };
    Router.events.on("routeChangeComplete", scrollToTop);

    return () => Router.events.off("routeChangeComplete", scrollToTop);
  }, []);

  const isERC1155 =
    collectionData?.collection?.standard === TokenStandard.ERC1155;

  const isLegions =
    getCollectionNameFromAddress(formattedAddress, chainId) === "Legions";

  const searchFilters = React.useMemo(
    () => formatSearchFilter(formattedSearch),
    [formattedSearch]
  );

  const { data: filteredData, isLoading: isFilterDataLoading } = useQuery(
    ["filtered-tokens", filters, searchFilters],
    () =>
      client.getFilteredTokens({
        collection: formattedAddress,
        filters: searchFilters,
      }),
    {
      enabled: searchFilters.length > 0,
      refetchInterval: false,
    }
  );

  const {
    data: searchedMarketplaceData,
    isLoading: isMarketplaceSearchedDataLoading,
  } = useQuery(
    ["marketplace-searched-tokens", searchParams],
    () =>
      marketplace.getTokensByName({
        collection: formattedAddress,
        name: searchParams,
      }),
    {
      enabled: !!formattedAddress && Boolean(searchParams) && !isLegions,
      refetchInterval: false,
    }
  );

  const { data: searchedLegionsData, isLoading: isLegionsSearchedDataLoading } =
    useQuery(
      ["legions-searched-tokens", searchParams],
      () =>
        bridgeworld.getTokensByName({
          collection: formattedAddress,
          name: searchParams,
        }),
      {
        enabled: !!formattedAddress && Boolean(searchParams) && isLegions,
        refetchInterval: false,
      }
    );

  const isSearchedDataLoading =
    isMarketplaceSearchedDataLoading || isLegionsSearchedDataLoading;

  const searchedData = React.useMemo(
    () => [
      ...(searchedLegionsData?.tokens?.map((token) => token.id) ?? []),
      ...(searchedMarketplaceData?.tokens?.map((token) => token.id) ?? []),
    ],
    [searchedLegionsData, searchedMarketplaceData]
  );

  const filteredTokenIds = React.useMemo(
    () => [
      ...(filteredData?.tokens?.map((token) => token.id) ?? []),
      ...searchedData,
    ],
    [filteredData, searchedData]
  );

  const {
    data: listingData,
    isLoading: isListingLoading,
    fetchNextPage,
  } = useInfiniteQuery(
    [
      "listings",
      { formattedAddress, sortParam, searchParams, search, filteredTokenIds },
    ],
    ({ queryKey, pageParam = 0 }) =>
      marketplace.getCollectionListings({
        id: formattedAddress,
        isERC1155,
        isERC721: !isERC1155 && filteredTokenIds.length === 0,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        tokenName: queryKey[1].searchParams,
        skipBy: pageParam,
        first: MAX_ITEMS_PER_PAGE,
        orderBy: sort
          ? MapSortToOrder(Array.isArray(sort) ? sort[0] : sort)
          : Listing_OrderBy.pricePerItem,
        orderDirection: sort
          ? MapSortToEnum(Array.isArray(sort) ? sort[0] : sort)
          : OrderDirection.asc,
        filteredTokenIds,
        withFilters: !isERC1155 && filteredTokenIds.length > 0,
      }),
    {
      enabled: !!formattedAddress && !!collectionData,
      getNextPageParam: (_, pages) => pages.length * MAX_ITEMS_PER_PAGE,
    }
  );

  const { data: metadataData } = useQuery(
    ["metadata", formattedAddress, listingData, filteredTokenIds],
    () =>
      client.getCollectionMetadata({
        id: formattedAddress,
        isERC1155,
        tokenId_in: listingData?.pages.reduce((acc, page) => {
          const tokenIds =
            (page.listings ?? page.filtered)?.map(
              (list) => list.token.tokenId
            ) || [];
          return [...acc, ...tokenIds];
        }, []),
      }),
    {
      enabled: !!formattedAddress && !!listingData && !isLegions,
      keepPreviousData: true,
    }
  );

  const { data: legionMetadataData } = useQuery(
    ["metadata-legions", listingData?.pages.length],
    () =>
      bridgeworld.getLegionMetadata({
        ids:
          listingData?.pages.reduce((acc, page) => {
            const ids =
              (page.listings ?? page.filtered)?.map((list) => list.token.id) ||
              [];
            return [...acc, ...ids];
          }, []) || [],
      }),
    {
      enabled: !!formattedAddress && !!listingData && isLegions,
      keepPreviousData: true,
    }
  );

  // reset searchParams on address change
  useEffect(() => {
    setSearchParams("");
    setSearchToken("");
  }, [formattedAddress]);

  const page = listingData?.pages[listingData.pages.length - 1];
  const data = isERC1155 ? page?.tokens : page?.listings ?? page?.filtered;

  const hasNextPage = data?.length === MAX_ITEMS_PER_PAGE;

  const { ref, inView } = useInView({
    threshold: 0,
  });

  useEffect(() => {
    if (inView) {
      fetchNextPage();
    }
  }, [fetchNextPage, inView]);

  const listingsWithoutDuplicates =
    statData?.collection?.listings.reduce((acc, curr) => {
      if (curr.token.name && !acc[curr.token.name]) {
        acc[curr.token.name] = formatNumber(
          parseFloat(formatEther(curr.token.floorPrice || Zero))
        );
      }

      return acc;
    }, {}) ?? {};

  return (
    <main>
      <Transition.Root show={mobileFiltersOpen} as={Fragment}>
        <Dialog
          as="div"
          className="fixed inset-0 flex z-40 lg:hidden"
          onClose={setMobileFiltersOpen}
        >
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Dialog.Overlay className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <Transition.Child
            as={Fragment}
            enter="transition ease-in-out duration-300 transform"
            enterFrom="translate-x-full"
            enterTo="translate-x-0"
            leave="transition ease-in-out duration-300 transform"
            leaveFrom="translate-x-0"
            leaveTo="translate-x-full"
          >
            <div className="ml-auto relative max-w-xs w-full h-full bg-white dark:bg-gray-900 shadow-xl py-4 pb-12 flex flex-col overflow-y-auto">
              <div className="px-4 flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-900 dark:text-gray-200">
                  Filters
                </h2>
                <button
                  type="button"
                  className="-mr-2 w-10 h-10 bg-white dark:bg-gray-900 p-2 rounded-md flex items-center justify-center text-gray-400"
                  onClick={() => setMobileFiltersOpen(false)}
                >
                  <span className="sr-only">Close menu</span>
                  <XIcon className="h-6 w-6" aria-hidden="true" />
                </button>
              </div>

              <div className="mt-4 border-t border-gray-200 dark:border-gray-500">
                <h3 className="sr-only">Filter</h3>

                {attributeFilterList &&
                  Object.keys(attributeFilterList).map((attributeKey) => {
                    const attributes = attributeFilterList[attributeKey].sort(
                      (a, b) =>
                        parseFloat(a.percentage) - parseFloat(b.percentage)
                    );
                    return (
                      <Disclosure
                        as="div"
                        key={attributeKey}
                        className="border-t border-gray-200 dark:border-gray-500 px-4 py-6"
                        defaultOpen={
                          filters[attributeKey] &&
                          filters[attributeKey].length > 0
                        }
                      >
                        {({ open }) => (
                          <>
                            <h3 className="-mx-2 -my-3 flow-root">
                              <Disclosure.Button className="px-2 py-3 w-full flex items-center justify-between text-gray-400 hover:text-gray-500">
                                <span
                                  className={classNames(
                                    "font-medium",
                                    open
                                      ? "text-red-700 dark:text-gray-300"
                                      : "text-gray-900 dark:text-gray-400"
                                  )}
                                >
                                  {attributeKey}
                                </span>
                                <span className="ml-6 flex items-center">
                                  <span className="mr-2 text-gray-600">
                                    {attributes.length}
                                  </span>
                                  {open ? (
                                    <MinusSmIcon
                                      className="block h-6 w-6 text-red-400 dark:text-gray-400 group-hover:text-gray-500"
                                      aria-hidden="true"
                                    />
                                  ) : (
                                    <PlusSmIcon
                                      className="block h-6 w-6 text-gray-400 dark:text-gray-400 group-hover:text-gray-200"
                                      aria-hidden="true"
                                    />
                                  )}
                                </span>
                              </Disclosure.Button>
                            </h3>
                            <Disclosure.Panel className="pt-6">
                              <div className="space-y-6">
                                {attributes.map(
                                  ({ value, percentage }, optionIdx) => (
                                    <div
                                      key={value}
                                      className="flex justify-between text-sm"
                                    >
                                      <div className="flex items-center">
                                        <input
                                          id={`filter-mobile-${value}-${optionIdx}`}
                                          name={value}
                                          onChange={(e) => {
                                            router.replace({
                                              pathname: `/collection/${slugOrAddress}`,
                                              query: {
                                                search: e.target.checked
                                                  ? createFilter(
                                                      formattedSearch,
                                                      {
                                                        key: attributeKey,
                                                        value,
                                                      }
                                                    )
                                                  : removeFilter(
                                                      formattedSearch,
                                                      {
                                                        key: attributeKey,
                                                        value,
                                                      }
                                                    ),
                                              },
                                            });
                                          }}
                                          checked={
                                            filters[attributeKey]?.[0]
                                              .split(",")
                                              .includes(value) ?? false
                                          }
                                          type="checkbox"
                                          className="h-4 w-4 border-gray-300 rounded accent-red-500"
                                        />
                                        <label
                                          htmlFor={`filter-mobile-${value}-${optionIdx}`}
                                          className="ml-3 min-w-0 flex-1 text-gray-600 dark:text-gray-400"
                                        >
                                          {value}
                                        </label>
                                      </div>
                                      <p className="text-gray-400 dark:text-gray-500">
                                        {formatPercent(percentage)}
                                      </p>
                                    </div>
                                  )
                                )}
                              </div>
                            </Disclosure.Panel>
                          </>
                        )}
                      </Disclosure>
                    );
                  })}
                <div className="mt-4 mx-4">
                  <Button
                    onClick={() =>
                      router.replace({
                        pathname: `/collection/${slugOrAddress}`,
                        query: {
                          search: "",
                        },
                      })
                    }
                  >
                    Clear all
                  </Button>
                </div>
              </div>
            </div>
          </Transition.Child>
        </Dialog>
      </Transition.Root>
      <div className="mx-auto px-4 sm:px-6 lg:px-8 pt-24">
        <div className="py-24 flex flex-col items-center">
          {collectionData?.collection && statData?.collection ? (
            <>
              <h1 className="text-xl md:text-5xl sm:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100">
                {statData.collection.name}
              </h1>
              {generateDescription(formattedAddress, chainId)}
              <div className="mt-12 overflow-hidden flex flex-col">
                <dl className="sm:-mx-8 -mt-8 flex divide-x-2">
                  <div className="flex flex-col px-6 sm:px-8 pt-8">
                    <dt className="order-2 text-[0.4rem] sm:text-base font-medium text-gray-500 dark:text-gray-400 mt-2 sm:mt-4 flex">
                      <span className="capsize">Floor Price</span>
                      <button
                        className="inline-flex self-end items-center ml-2"
                        onClick={() =>
                          setFloorCurrency((currency) =>
                            currency === "eth" ? "magic" : "eth"
                          )
                        }
                      >
                        <SwapIcon className="h-[0.6rem] w-[0.6rem] sm:h-4 sm:w-4" />
                        {floorCurrency === "eth" ? (
                          <MagicIcon className="h-[0.6rem] w-[0.6rem] sm:h-4 sm:w-4" />
                        ) : (
                          <EthIcon className="h-[0.6rem] w-[0.6rem] sm:h-4 sm:w-4" />
                        )}
                      </button>
                    </dt>
                    <dd className="order-1 text-base font-extrabold text-red-600 dark:text-gray-200 sm:text-3xl flex">
                      {floorCurrency === "eth" ? (
                        <EthIcon className="h-[0.6rem] w-[0.6rem] sm:h-4 sm:w-4 self-end mr-2" />
                      ) : (
                        <MagicIcon className="h-[0.6rem] w-[0.6rem] sm:h-4 sm:w-4 self-end mr-2" />
                      )}
                      <span className="capsize">
                        {floorCurrency === "eth"
                          ? formatNumber(
                              Number(
                                parseFloat(
                                  formatEther(statData.collection.floorPrice)
                                )
                              ) * parseFloat(ethPrice)
                            )
                          : formatPrice(statData.collection.floorPrice)}{" "}
                      </span>
                    </dd>
                  </div>
                  <div className="flex flex-col px-6 sm:px-8 pt-8">
                    <dt className="order-2 text-[0.4rem] sm:text-base font-medium text-gray-500 dark:text-gray-400 mt-2 sm:mt-4">
                      Total Listings
                    </dt>
                    <dd className="order-1 text-base font-extrabold text-red-600 dark:text-gray-200 sm:text-3xl capsize">
                      {formatNumber(statData.collection.totalListings)}
                    </dd>
                  </div>
                  <div className="flex flex-col px-6 sm:px-8 pt-8">
                    <dt className="order-2 text-[0.4rem] sm:text-base font-medium text-gray-500 dark:text-gray-400 mt-2 sm:mt-4">
                      Volume ($MAGIC)
                    </dt>
                    <dd className="order-1 text-base font-extrabold text-red-600 dark:text-gray-200 sm:text-3xl capsize">
                      {abbreviatePrice(statData.collection.totalVolume)}
                    </dd>
                  </div>
                </dl>
                {isERC1155 && statData.collection.totalListings > 0 && (
                  <button
                    className="ml-6 sm:ml-0 text-[0.4rem] sm:text-xs block underline place-self-start mt-2 dark:text-gray-300"
                    onClick={() => setDetailedFloorPriceModalOpen(true)}
                  >
                    Compare floor prices &gt;
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="animate-pulse w-56 bg-gray-300 h-12 rounded-md m-auto" />
          )}
        </div>
        <div>
          <div className="block" id="filter-heading">
            <div className="border-b border-gray-200 dark:border-gray-500">
              <nav
                className="-mb-px flex justify-center space-x-8"
                aria-label="Tabs"
              >
                {tabs.map((tab) => {
                  const isCurrentTab = formattedTab === tab.name.toLowerCase();
                  return (
                    <Link
                      key={tab.name}
                      href={{
                        pathname: router.pathname,
                        query: {
                          ...router.query,
                          tab: tab.value,
                        },
                      }}
                      passHref
                    >
                      <a
                        className={classNames(
                          isCurrentTab
                            ? "border-red-500 text-red-600 dark:border-gray-300 dark:text-gray-300"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:hover:border-gray-500",
                          "whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm"
                        )}
                        aria-current={isCurrentTab ? "page" : undefined}
                      >
                        {tab.name}
                      </a>
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        </div>
        {formattedTab === "collection" ? (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-x-8 gap-y-10">
            {attributeFilterList && (
              <div className="hidden lg:block sticky top-6">
                <h3 className="sr-only">Filter</h3>
                <div className="sticky top-16 overflow-auto h-[calc(100vh-72px)]">
                  {Object.keys(attributeFilterList).map((attributeKey) => {
                    const attributes = attributeFilterList[attributeKey].sort(
                      (a, b) =>
                        parseFloat(a.percentage) - parseFloat(b.percentage)
                    );
                    return (
                      <Disclosure
                        as="div"
                        key={attributeKey}
                        className="border-b border-gray-200 dark:border-gray-500 py-6"
                        defaultOpen={
                          filters[attributeKey] &&
                          filters[attributeKey].length > 0
                        }
                      >
                        {({ open }) => (
                          <>
                            <h3 className="-my-3 flow-root">
                              <Disclosure.Button className="py-3 w-full flex items-center justify-between text-sm text-gray-400 hover:text-gray-500">
                                <span
                                  className={classNames(
                                    "font-medium",
                                    open
                                      ? "text-red-700 dark:text-gray-300"
                                      : "text-gray-900 dark:text-gray-400"
                                  )}
                                >
                                  {attributeKey}
                                </span>
                                <span className="ml-6 flex items-center">
                                  <span className="mr-2 text-gray-600">
                                    {attributes.length}
                                  </span>
                                  {open ? (
                                    <MinusSmIcon
                                      className="block h-6 w-6 text-red-400 dark:text-gray-400 group-hover:text-gray-500"
                                      aria-hidden="true"
                                    />
                                  ) : (
                                    <PlusSmIcon
                                      className="block h-6 w-6 text-gray-400 dark:text-gray-400 group-hover:text-gray-200"
                                      aria-hidden="true"
                                    />
                                  )}
                                </span>
                              </Disclosure.Button>
                            </h3>
                            <Disclosure.Panel className="pt-6 overflow-auto max-h-72">
                              <div className="space-y-4">
                                {attributes.map(
                                  ({ value, percentage }, optionIdx) => (
                                    <div
                                      key={value}
                                      className="flex justify-between text-sm"
                                    >
                                      <div className="flex items-center">
                                        <input
                                          id={`filter-${value}-${optionIdx}`}
                                          name={value}
                                          onChange={(e) => {
                                            router.replace({
                                              pathname: `/collection/${slugOrAddress}`,
                                              query: {
                                                search: e.target.checked
                                                  ? createFilter(
                                                      formattedSearch,
                                                      {
                                                        key: attributeKey,
                                                        value,
                                                      }
                                                    )
                                                  : removeFilter(
                                                      formattedSearch,
                                                      {
                                                        key: attributeKey,
                                                        value,
                                                      }
                                                    ),
                                              },
                                            });
                                          }}
                                          checked={
                                            filters[attributeKey]?.[0]
                                              .split(",")
                                              .includes(value) ?? false
                                          }
                                          type="checkbox"
                                          className="h-4 w-4 border-gray-300 rounded accent-red-500"
                                        />
                                        <label
                                          htmlFor={`filter-${value}-${optionIdx}`}
                                          className="ml-3 text-gray-600 dark:text-gray-400"
                                        >
                                          {value}
                                        </label>
                                      </div>
                                      <p className="text-gray-400 dark:text-gray-500">
                                        {formatPercent(percentage)}
                                      </p>
                                    </div>
                                  )
                                )}
                              </div>
                            </Disclosure.Panel>
                          </>
                        )}
                      </Disclosure>
                    );
                  })}
                  <div className="mt-4 mx-1">
                    <Button
                      onClick={() =>
                        router.replace({
                          pathname: `/collection/${slugOrAddress}`,
                          query: {
                            search: "",
                          },
                        })
                      }
                    >
                      Clear all
                    </Button>
                  </div>
                </div>
              </div>
            )}
            <div
              className={classNames(
                attributeFilterList ? "lg:col-span-3" : "lg:col-span-4"
              )}
            >
              <section aria-labelledby="filter-heading" className="pt-6">
                <h2 id="filter-heading" className="sr-only">
                  Product filters
                </h2>

                {statData?.collection && (
                  <div className="flex items-center">
                    <div className="mr-2 w-full">
                      <input
                        type="text"
                        className="form-input focus:ring-red-500 focus:border-red-500 dark:focus:ring-gray-300 dark:focus:border-gray-300 block w-full pr-16 sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:disabled:bg-gray-500 dark:placeholder-gray-400 rounded-md disabled:placeholder-gray-300 disabled:text-gray-300 transition-placeholder transition-text ease-linear duration-300 disabled:cursor-not-allowed"
                        placeholder="Search Name... (Enter to search)"
                        value={searchToken}
                        onChange={(e) => setSearchToken(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            setSearchParams(searchToken);
                          }
                        }}
                      />
                    </div>
                    <Menu
                      as="div"
                      className="relative z-20 inline-block text-left"
                    >
                      <div className="flex items-center space-x-2">
                        <Menu.Button className="group inline-flex justify-center text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-500 dark:hover:text-gray-200">
                          Sort
                          <ChevronDownIcon
                            className="flex-shrink-0 -mr-1 ml-1 h-5 w-5 text-gray-400 group-hover:text-gray-500 dark:text-gray-400 dark:group-hover:text-gray-100"
                            aria-hidden="true"
                          />
                        </Menu.Button>
                        {!isERC1155 && (
                          <button
                            type="button"
                            className="p-2 -m-2 text-gray-400 hover:text-gray-500 lg:hidden"
                            onClick={() => setMobileFiltersOpen(true)}
                          >
                            <span className="sr-only">Filters</span>
                            <FilterIcon
                              className="w-5 h-5"
                              aria-hidden="true"
                            />
                          </button>
                        )}
                      </div>

                      <Transition
                        as={Fragment}
                        enter="transition ease-out duration-100"
                        enterFrom="transform opacity-0 scale-95"
                        enterTo="transform opacity-100 scale-100"
                        leave="transition ease-in duration-75"
                        leaveFrom="transform opacity-100 scale-100"
                        leaveTo="transform opacity-0 scale-95"
                      >
                        <Menu.Items className="origin-top-left absolute right-0 z-10 mt-2 w-48 rounded-md shadow-2xl bg-white dark:bg-gray-700 ring-1 ring-black ring-opacity-5 focus:outline-none">
                          <div className="py-1">
                            {sortOptions
                              .slice(0, isERC1155 ? -1 : sortOptions.length)
                              .map((option) => {
                                const active = option.value === sortParam;
                                return (
                                  <Menu.Item key={option.name}>
                                    <QueryLink
                                      href={{
                                        pathname: router.pathname,
                                        query: {
                                          ...router.query,
                                          sort: option.value,
                                        },
                                      }}
                                      passHref
                                      className={classNames(
                                        "block px-4 py-2 text-sm font-medium text-gray-900 dark:text-gray-500",
                                        {
                                          "text-red-500 dark:text-gray-100":
                                            active,
                                        }
                                      )}
                                    >
                                      <span>{option.name}</span>
                                    </QueryLink>
                                  </Menu.Item>
                                );
                              })}
                          </div>
                        </Menu.Items>
                      </Transition>
                    </Menu>
                  </div>
                )}
              </section>
              {isListingLoading || isFilterDataLoading ? (
                <CenterLoadingDots className="h-60" />
              ) : null}
              {data?.length === 0 && !isListingLoading && (
                <div className="flex flex-col justify-center items-center h-36">
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-200">
                    No NFTs listed 😞
                  </h3>
                </div>
              )}
              {listingData &&
              collectionData &&
              !isListingLoading &&
              !isFilterDataLoading &&
              !isSearchedDataLoading ? (
                <section aria-labelledby="products-heading" className="my-8">
                  <h2 id="products-heading" className="sr-only">
                    {collectionData.collection?.name}
                  </h2>
                  <ul
                    role="list"
                    className="grid grid-cols-2 gap-y-10 sm:grid-cols-4 gap-x-6 lg:grid-cols-6 xl:gap-x-8"
                  >
                    {listingData.pages.map((group, i) => (
                      <React.Fragment key={i}>
                        {/* ERC1155 */}
                        {group.tokens
                          ?.filter((token) => Boolean(token?.listings?.length))
                          .map((token) => {
                            const metadata = metadataData?.erc1155?.find(
                              (metadata) => metadata.tokenId === token.tokenId
                            );

                            return (
                              <li key={token.id} className="group">
                                <div className="block w-full aspect-w-1 aspect-h-1 rounded-sm overflow-hidden sm:aspect-w-3 sm:aspect-h-3 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-gray-100 focus-within:ring-red-500">
                                  {metadata?.metadata ? (
                                    <ImageWrapper
                                      className="w-full h-full object-center object-fill group-hover:opacity-75"
                                      token={metadata}
                                    />
                                  ) : (
                                    <div className="animate-pulse w-full bg-gray-300 h-64 rounded-md m-auto" />
                                  )}
                                  <Link
                                    href={`/collection/${slugOrAddress}/${token.tokenId}`}
                                    passHref
                                  >
                                    <a className="absolute inset-0 focus:outline-none">
                                      <span className="sr-only">
                                        View details for {metadata?.name}
                                      </span>
                                    </a>
                                  </Link>
                                </div>
                                <div className="mt-4 text-base font-medium text-gray-900 space-y-2">
                                  <p className="text-xs text-gray-800 dark:text-gray-50 font-semibold truncate">
                                    {metadata?.name}
                                  </p>
                                  <p className="dark:text-gray-100 text-sm xl:text-base capsize">
                                    {formatNumber(
                                      parseFloat(
                                        formatEther(
                                          token?.listings?.[0]?.pricePerItem
                                        )
                                      )
                                    )}{" "}
                                    <span className="text-[0.5rem] xl:text-xs font-light">
                                      $MAGIC
                                    </span>
                                  </p>
                                  <p className="text-xs text-[0.6rem] ml-auto whitespace-nowrap">
                                    <span className="text-gray-500 dark:text-gray-400">
                                      Listed Items:
                                    </span>{" "}
                                    <span className="font-bold text-gray-700 dark:text-gray-300">
                                      {getTotalQuantity(token.listings)}
                                    </span>
                                  </p>
                                </div>
                              </li>
                            );
                          })}
                        {/* ERC721 */}
                        {(group?.listings ?? group?.filtered)?.map(
                          (listing) => {
                            const legionsMetadata =
                              legionMetadataData?.tokens.find(
                                (item) => item.id === listing.token.id
                              );
                            const erc721Metadata = metadataData?.erc721?.find(
                              (item) => item?.tokenId === listing.token.tokenId
                            );
                            const metadata = isLegions
                              ? legionsMetadata
                                ? {
                                    id: legionsMetadata.id,
                                    name: legionsMetadata.name,
                                    tokenId: listing.token.tokenId,
                                    metadata: {
                                      image: legionsMetadata.image,
                                      name: legionsMetadata.name,
                                      description: "Legions",
                                    },
                                  }
                                : erc721Metadata
                              : erc721Metadata;

                            return (
                              <li key={listing.id} className="group">
                                <div className="block w-full aspect-w-1 aspect-h-1 rounded-sm overflow-hidden focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-gray-100 focus-within:ring-red-500">
                                  {metadata ? (
                                    <ImageWrapper
                                      className="w-full h-full object-center object-fill group-hover:opacity-75"
                                      token={metadata}
                                    />
                                  ) : (
                                    <div className="animate-pulse w-full bg-gray-300 h-64 rounded-md m-auto" />
                                  )}
                                  <Link
                                    href={`/collection/${slugOrAddress}/${listing.token.tokenId}`}
                                  >
                                    <a className="absolute inset-0 focus:outline-none">
                                      <span className="sr-only">
                                        View details for {metadata?.name}
                                      </span>
                                    </a>
                                  </Link>
                                </div>
                                <div className="mt-4 font-medium text-gray-900 space-y-2">
                                  <p className="text-xs text-gray-500 dark:text-gray-300 truncate font-semibold">
                                    {metadata?.name}
                                  </p>
                                  <p className="dark:text-gray-100 text-sm xl:text-base capsize">
                                    {formatNumber(
                                      parseFloat(
                                        formatEther(listing.pricePerItem)
                                      )
                                    )}{" "}
                                    <span className="text-[0.5rem] xl:text-xs font-light">
                                      $MAGIC
                                    </span>
                                  </p>
                                </div>
                              </li>
                            );
                          }
                        )}
                      </React.Fragment>
                    ))}
                  </ul>
                  {hasNextPage && (
                    <ul
                      role="list"
                      ref={ref}
                      className="mt-10 grid grid-cols-2 gap-y-10 sm:grid-cols-4 gap-x-6 lg:grid-cols-6 xl:gap-x-8"
                    >
                      {Array.from({ length: 6 }).map((_, i) => (
                        <li key={i}>
                          <div className="animate-pulse w-full bg-gray-300 h-64 rounded-md m-auto" />
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ) : null}
            </div>
          </div>
        ) : (
          <>
            {isActivityLoading && <CenterLoadingDots className="h-60" />}
            {activityData?.listings && (
              <Listings
                listings={activityData.listings}
                sort={activitySortParam}
              />
            )}
          </>
        )}
      </div>

      {statData?.collection && isDetailedFloorPriceModalOpen && (
        <DetailedFloorPriceModal
          isOpen={true}
          onClose={() => setDetailedFloorPriceModalOpen(false)}
          listingsWithoutDuplicates={listingsWithoutDuplicates}
        />
      )}
    </main>
  );
};

const DetailedFloorPriceModal = ({
  isOpen,
  onClose,
  listingsWithoutDuplicates,
}: {
  isOpen: boolean;
  onClose: () => void;
  listingsWithoutDuplicates: { [key: string]: string };
}) => {
  const [lists, setList] = useState(listingsWithoutDuplicates);

  return (
    <Modal onClose={onClose} isOpen={isOpen} title="Compare floor prices">
      <div className="mt-4">
        <SearchAutocomplete
          placeholder="Search Token..."
          onSelectionChange={(key) => {
            if (!key) {
              setList(listingsWithoutDuplicates);
              return;
            }
            const targetCollection = { [key]: lists[key] };

            setList(targetCollection);
          }}
        >
          {Object.keys(listingsWithoutDuplicates)
            .sort()
            .map((key) => (
              <Item key={key}>{key}</Item>
            ))}
        </SearchAutocomplete>
        <div className="flex flex-col mt-2">
          <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
              <div className="overflow-auto dark:divide-gray-400 rounded-md max-h-96">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 dark:bg-gray-500 sticky top-0">
                    <tr>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                      >
                        Token
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                      >
                        Floor Price ($MAGIC)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.keys(lists)
                      .sort()
                      .map((list, listIdx) => {
                        const floorPrice = lists[list];
                        return (
                          <tr
                            key={list}
                            className={
                              listIdx % 2 === 0
                                ? "bg-white dark:bg-gray-200"
                                : "bg-gray-50 dark:bg-gray-300"
                            }
                          >
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-700">
                              {list}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-700">
                              {floorPrice}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default Collection;
