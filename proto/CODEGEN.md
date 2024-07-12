create lnd classes: `npx protoc -I ./others --ts_out=./lnd others/*`
create server classes: `npx protoc -I ./service --pub_out=. service/*`

export PATH=$PATH:~/Lightning.Pub/proto