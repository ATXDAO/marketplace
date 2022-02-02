import gql from "graphql-tag";

export const getLegionMetadata = gql`
  query getLegionMetadata($ids: [ID!]!) {
    tokens(first: 1000, where: { id_in: $ids }) {
      id
      image
      name
      tokenId
      metadata {
        __typename
        ... on LegionInfo {
          boost
          cooldown
          crafting
          questing
          summons
          rarity
          role
          type
          summons
        }
      }
    }
  }
`;

export const getTokensByName = gql`
  query getTokensByName($name: String!, $collection: Bytes!) {
    tokens(
      first: 1000
      where: { name_contains: $name, contract: $collection }
    ) {
      id
    }
  }
`;
