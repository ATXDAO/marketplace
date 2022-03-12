import gql from "graphql-tag";

export const getSmolverseMetadata = gql`
  query getSmolverseMetadata($ids: [ID!]!) {
    tokens(first: 1000, where: { id_in: $ids }) {
      id
      attributes {
        name
        percentage
        value
      }
      image
      name
      tokenId
    }
  }
`;
