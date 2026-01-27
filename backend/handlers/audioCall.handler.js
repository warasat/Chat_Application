export const registerCallHandlers = (io, socket) => {
  //  Caller starts call
  socket.on("call-user", ({ chatId, from, offer, phoneNumber }) => {
    const callRoom = `call_${chatId}`;

    const receiverSocket = Array.from(io.sockets.sockets.values()).find(
      (s) => s.senderId !== from && s.rooms.has(callRoom),
    );

    const isOnline = !!receiverSocket;

    io.to(callRoom).emit("incoming-call", {
      from,
      offer,
      phoneNumber,
      isOnline,
    });

    io.to(from).emit("call-status", { isOnline });

    console.log(
      `📞 Call from ${from} in ${callRoom}. Status: ${isOnline ? "Ringing" : "Calling"}`,
    );
  });

  //  Callee answers call
  socket.on("answer-call", ({ chatId, answer, from }) => {
    const callRoom = `call_${chatId}`;
    console.log(`✅ Call answered by ${from}`);
    io.to(callRoom).emit("call-answered", { answer, from });
  });

  //  Exchange ICE candidates
  socket.on("ice-candidate", ({ chatId, candidate, from }) => {
    const callRoom = `call_${chatId}`;
    // Broadcast to the other person in the room
    socket.to(callRoom).emit("ice-candidate", { candidate, from });
  });

  //  End call
  socket.on("end-call", ({ chatId, from }) => {
    const callRoom = `call_${chatId}`;
    console.log(`❌ Call ended by ${from}`);
    io.to(callRoom).emit("call-ended", { from });
  });
};
