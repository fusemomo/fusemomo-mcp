package config

import (
	"log"
	"mcpserver/pkg/utils"

	"github.com/joho/godotenv"
)

type Config struct {
	PORT     int
	DEV_MODE bool
}

var Envs = initConfig()

func initConfig() Config {
	err := godotenv.Load()
	if err != nil {
		log.Fatal("Error loading .env file")
	}

	return Config{
		PORT:     utils.GetEnvAsInt("PORT", 8000),
		DEV_MODE: utils.GetEnv("DEV_MODE", "false") == "true",
	}
}
