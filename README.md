# ATXDAO Marketplace

This is the source code for Treasure Marketplace frontend. Check out the [subgraph repo](https://github.com/TreasureProject/treasure-marketplace-subgraph) for the API integration part.

Tech stack:

- Next.js
- tailwindcss
- react-query
- TypeScript

## Development

This repo uses yarn to manage dependencies.

To get the dev environment running on `localhost:3000`, run the following commands:

1. `yarn install`
2. `yarn dev`

We also use `graphql-codegen` to read the graphql endpoint defined in `codegen.yml` to generate type-safe graphql queries to be consumed by `react-query`.

**Important:** Before you attempt to run the dev environment for the first time, please run:

`yarn generate`

to generate type-safe graphql queries.

After that, in order to automatically generate type-safe graphql queries, run this command in a separate window:

`yarn watch:codegen`

Every time you make changes to `queries.graphql.ts`, the watcher will check if that query exists in the endpoint, and if it does, spits out appropriate typesafe query for you.
