package main

import (
	"fmt"
	"io"
	"net/http"
	"os"
)

func hello(w http.ResponseWriter, r *http.Request) {
	host, _ := os.Hostname()
	dbPassword := os.Getenv("DB_PASSWORD")
	io.WriteString(w, fmt.Sprintf("[v5] Hello, Kubernetes! From host: %s, Get Database Connect Password: %s", host, dbPassword))
}

func main() {
	http.HandleFunc("/", hello)
	http.ListenAndServe(":3000", nil)
}