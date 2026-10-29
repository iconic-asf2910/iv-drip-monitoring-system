package main

import (
	"log"
	"net/http"
	"os"

	"smart-iv-backend/server"
	simulation "smart-iv-backend/sim"
)

func main() {
	engine := simulation.NewEngine()
	engine.Start()
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	addr := ":" + port
	log.Printf("Starting server on %s", addr)
	if err := http.ListenAndServe(addr, server.NewServer(engine)); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
