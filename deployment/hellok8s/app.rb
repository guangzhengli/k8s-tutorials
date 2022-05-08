require "sinatra"

set :bind, "0.0.0.0"

$counter = 0

get "*" do
  $counter += 1.gitignore
  if $counter > 3
    raise "Whoops, something is wrong"
  end

  "[bad] Hello, Kubernetes!\n"
end