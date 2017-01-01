FROM node:argon

RUN npm --user root --unsafe-perm true install npm -g

ADD package.json /tmp/package.json
RUN cd /tmp && npm install && npm install -g gulp
RUN mkdir -p /opt/app && cp -a /tmp/node_modules /opt/app/

WORKDIR /opt/app
ADD . /opt/app

EXPOSE 8080

CMD ["npm", "run", "build-and-serve"]
