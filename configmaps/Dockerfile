FROM ruby:2.6.1-alpine3.9

RUN apk add curl && gem install sinatra
COPY app.rb .
ENTRYPOINT ["ruby", "app.rb"]