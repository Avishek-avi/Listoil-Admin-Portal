docker build -t spacempact/sturlite-admin-panel:uat .
docker push spacempact/sturlite-admin-panel:uat
docker pull spacempact/sturlite-admin-panel:uat
sudo docker rm -f sturlite-admin-panel
sudo docker run -d   --name sturlite-admin-panel   --network sturlite-net   --env-file cms.env   -p 3001:3000   spacempact/sturlite-admin-panel:uat