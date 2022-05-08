# app.rb
require "sinatra"

set :bind, "0.0.0.0"

get "*" do
  "[v2] Hello, Kubernetes!\n"
end