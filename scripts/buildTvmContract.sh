#!/bin/bash

os_name=$(uname)
os=""
if [ "$os_name" = "Linux" ]; then
  echo "linux"
  os=".lin"
elif [ "$os_name" = "Darwin" ]; then
  echo "macos"
else
  echo "Error: unknown os"
  exit 1
fi

cd contracts

mkdir -p "artifacts"
contract_path=$1
contract_name="${contract_path##*/}"
echo "Compiling $contract_path"
./sold$os --tvm-version=ton -o=artifacts $contract_path.tsol

output=$(./tvm_linker$os decode --tvc ./artifacts/$contract_name.tvc)
#code=$(echo "$output" | grep -oP 'code:\s*\K\S+')
code=$(echo "$output" | sed -n 's/.*code: \([^ ]*\).*/\1/p')
json_content="{\n  \"code\": \"$code\"\n}"
echo -e "$json_content" > ./artifacts/$contract_name.code.json
echo "$contract_name compiled and saved to json"
