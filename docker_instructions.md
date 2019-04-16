# Docker instructions

1. Run `docker login` and put in the information it asks you for from your docker account 

2. In the root of lookerbot run `docker build . -t lookerbot`

3. Once the image is finished building, you can run it with `docker run -t lookerbot` 

4. If you need to stop it from running press control + c 

5. If you are running into problems with multiple lookerbots running you can just exit docker from the icon in your top bar then start it again - this is not ideal but saves me having to show you how to find and kill the containers :) 

