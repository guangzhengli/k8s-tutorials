package main

import (
	"fmt"
	"io"
	"net/http"
	"os"
)

func hello(w http.ResponseWriter, r *http.Request) {
	host, _ := os.Hostname()
	message := os.Getenv("MESSAGE")
	namespace := os.Getenv("NAMESPACE")
	dbURL := os.Getenv("DB_URL")
	dbPassword := os.Getenv("DB_PASSWORD")

	io.WriteString(w, fmt.Sprintf("[v6] Hello, Helm! Message from helm values: %s, From namespace: %s, From host: %s, Get Database Connect URL: %s, Database Connect Password: %s", message, namespace, host, dbURL, dbPassword))
}

func main() {
	http.HandleFunc("/", hello)
	http.ListenAndServe(":3000", nil)
}