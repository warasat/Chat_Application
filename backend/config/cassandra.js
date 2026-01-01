import cassandra from "cassandra-driver";

// Cassandra Client Configuration
const client = new cassandra.Client({
  contactPoints: ["127.0.0.1"],
  localDataCenter: "datacenter1",
  keyspace: "Chat_Application",
});

const connectCassandra = async () => {
  try {
    await client.connect();

    // dummy query for connection test
    const query = "SELECT cluster_name FROM system.local";
    const result = await client.execute(query);

    console.log(
      ` Cassandra Connected! Cluster: ${result.rows[0].cluster_name}`
    );
  } catch (error) {
    console.error(" Cassandra Connection Failed:", error.message);
  }
};

export { client, connectCassandra };
