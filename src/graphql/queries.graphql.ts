import gql from "graphql-tag";

export const getCollectionAttributes = gql`
  query getCollectionAttributes($id: ID!) {
    collection(id: $id) {
      attributes {
        name
        percentage
        value
      }
    }
  }
`;

export const getCollectionMetadata = gql`
  query getCollectionMetadata($ids: [ID!]!) {
    tokens(first: 1000, where: { id_in: $ids }) {
      metadata {
        image
        name
        description
      }
      name
      tokenId
    }
  }
`;

export const getTokenMetadata = gql`
  query getTokenMetadata($id: ID!) {
    token(id: $id) {
      metadata {
        attributes {
          attribute {
            id
            name
            percentage
            value
          }
        }
        image
        name
        description
      }
      name
      tokenId
    }
  }
`;

export const getFilteredTokens = gql`
  query getFilteredTokens($attributeIds: [String!]!, $tokenIds: [String!]!) {
    metadataAttributes(
      where: { attribute_in: $attributeIds, metadata_in: $tokenIds }
    ) {
      id
    }
  }
`;

export const getTokensMetadata = gql`
  query getTokensMetadata($ids: [ID!]!) {
    tokens(
      first: 1000
      where: {
        collection_not: "0xfe8c1ac365ba6780aec5a985d989b327c27670a1"
        id_in: $ids
      }
    ) {
      id
      metadata {
        image
        name
        description
      }
      name
      tokenId
    }
  }
`;
