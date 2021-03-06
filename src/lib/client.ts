import { GraphQLClient } from "graphql-request";
import { getSdk as getBridgeworldSdk } from "../../generated/bridgeworld.graphql";
import { getSdk as getMarketplaceSdk } from "../../generated/marketplace.graphql";
import { getSdk as getMetadataSdk } from "../../generated/metadata.graphql";
import { getSdk as getQueriesSdk } from "../../generated/queries.graphql";
import { getSdk as getRealmSdk } from "../../generated/realm.graphql";
import { getSdk as getSmolverseSdk } from "../../generated/smolverse.graphql";

export const bridgeworld = getBridgeworldSdk(
  new GraphQLClient(`${process.env.NEXT_PUBLIC_BRIDGEWORLD_SUBGRAPH}`)
);

export const client = getQueriesSdk(
  new GraphQLClient(`${process.env.NEXT_PUBLIC_GRAPHQL_URL}`)
);

export const marketplace = getMarketplaceSdk(
  new GraphQLClient(`${process.env.NEXT_PUBLIC_MARKETPLACE_SUBGRAPH}`)
);

export const metadata = getMetadataSdk(
  new GraphQLClient(`${process.env.NEXT_PUBLIC_METADATA_SUBGRAPH}`)
);

export const realm = getRealmSdk(
  new GraphQLClient(`${process.env.NEXT_PUBLIC_REALM_SUBGRAPH}`)
);

export const smolverse = getSmolverseSdk(
  new GraphQLClient(`${process.env.NEXT_PUBLIC_SMOLVERSE_SUBGRAPH}`)
);

export default client;
