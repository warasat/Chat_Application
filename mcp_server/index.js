import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { MongoClient, ObjectId } from "mongodb";

// MongoDB Configuration
const mongoUri = "mongodb://localhost:27017";
const mongoClient = new MongoClient(mongoUri);
const dbName = "chat_application";

const server = new Server(
  { name: "chat-ai-connector", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "search_my_contacts",
      description:
        "Search for a contact by name OR phone number in the logged-in user's contact list.",
      inputSchema: {
        type: "object",
        properties: {
          myUserId: {
            type: "string",
            description: "MongoId of logged in User",
          },
          searchTerm: {
            type: "string",
            description: "The name or phone number to search for",
          },
        },
        required: ["myUserId", "searchTerm"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "search_my_contacts") {
    try {
      await mongoClient.connect();
      const db = mongoClient.db(dbName);
      const usersCollection = db.collection("users");

      const { myUserId, searchTerm } = args;

      if (!ObjectId.isValid(myUserId)) {
        return {
          content: [{ type: "text", text: "Invalid User ID format." }],
          isError: true,
        };
      }

      // 1. Logged-in User ka data nikalna
      const currentUser = await usersCollection.findOne({
        _id: new ObjectId(myUserId),
      });

      if (
        !currentUser ||
        !currentUser.contacts ||
        currentUser.contacts.length === 0
      ) {
        return {
          content: [{ type: "text", text: "Your contact list is empty." }],
        };
      }

      const contactIdsStrings = currentUser.contacts.map((id) => id.toString());

      // 2. Query Logic: ID list mein ho AND (Username match kare OR PhoneNumber match kare)
      const matchedContacts = await usersCollection
        .find({
          $and: [
            {
              $expr: {
                $in: [{ $toString: "$_id" }, contactIdsStrings],
              },
            },
            {
              $or: [
                { username: { $regex: searchTerm, $options: "i" } },
                { phoneNumber: { $regex: searchTerm, $options: "i" } },
              ],
            },
          ],
        })
        .project({ username: 1, phoneNumber: 1, profilePic: 1, _id: 1 })
        .toArray();

      if (matchedContacts.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `No contact found matching '${searchTerm}'.`,
            },
          ],
        };
      }

      // Success: Return JSON array
      return {
        content: [{ type: "text", text: JSON.stringify(matchedContacts) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
        isError: true,
      };
    }
  }
  throw new Error("Tool not found");
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("MCP Server with MongoDB running...");
