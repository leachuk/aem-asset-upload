#!/bin/bash

while getopts r: option
do
case "${option}"
in
r) ROOT_CONTENT_FOLDER=${OPTARG};;
esac
done

echo "ROOT_CONTENT_FOLDER: $ROOT_CONTENT_FOLDER"

find "$ROOT_CONTENT_FOLDER" -type f > exported.txt
