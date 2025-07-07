// import { ApolloClient, InMemoryCache, HttpLink } from "@apollo/client";
// import { MockedProvider } from "@apollo/client/testing";
// import { gql } from "@apollo/client";

// export const mocks = [
//   {
//     request: {
//       query: gql`
//         query GetTodo($id: ID!) {
//           getTodo(id: $id) {
//             id
//             title
//             description
//             completed
//             createdAt
//           }
//         }
//       `,
//       variables: { id: "1" },
//     },
//     result: {
//       data: {
//         getTodo: {
//           id: "1",
//           title: "Sample Todo",
//           description: "This is a mock todo",
//           completed: false,
//           createdAt: "2025-06-16T15:22:00Z",
//         },
//       },
//     },
//   },
//   {
//     request: {
//       query: gql`
//         query GetAllTodos {
//           getAllTodos {
//             id
//             title
//             completed
//           }
//         }
//       `,
//     },
//     result: {
//       data: {
//         getAllTodos: [
//           { id: "1", title: "Todo 1", completed: false },
//           { id: "2", title: "Todo 2", completed: true },
//         ],
//       },
//     },
//   },
//   {
//     request: {
//       query: gql`
//         mutation CreateTodo(
//           $title: String!
//           $description: String
//           $userId: ID!
//         ) {
//           createTodo(
//             title: $title
//             description: $description
//             userId: $userId
//           ) {
//             id
//             title
//             description
//             completed
//             createdAt
//           }
//         }
//       `,
//       variables: { title: "New Todo", description: null, userId: "1" },
//     },
//     result: {
//       data: {
//         createTodo: {
//           id: "3",
//           title: "New Todo",
//           description: null,
//           completed: false,
//           createdAt: "2025-06-16T15:22:00Z",
//         },
//       },
//     },
//   },
// ];

// export const mockApolloClient = new ApolloClient({
//   cache: new InMemoryCache(),
// });
