# Godbot
A new music-bot for discord that utilizes Discord's new button functionality. Also works with commands.

## 1. Commands - Use ! in your channel of choice as the default command script.

### a. Play
    !p, !play
play takes youtube and soundcloud links, or strings that will default search youtube and provide 5 results.
#### Example
    !p Pocketful of Sunshine

  ![image](https://user-images.githubusercontent.com/61099229/135664846-f43a04ba-bb9e-4e39-8619-8977ee1fc46a.png)
    
Then select from the buttons which link you would like to be played.

An embedded message will return, with play buttons attached.

   ![image](https://user-images.githubusercontent.com/61099229/135665713-9fc4d74d-f408-4f41-87f4-904d158fb0b6.png)
   
Each button functions as intended, where pause will pause the song, play with resume, stop will end the song, and skip will skip to the next song in the queue, or stop the song playing if the queue is empty.


### b. Pause
    !ps, !pause
Pause will pause the currently playing song.
#### Example
    !ps
Each time a button is pressed an emote is produced to show the state of the player. Reacts with the ⏸ emote.


### c. Skip
    !skip
Skips the current song playing, or stops the song if the queue is empty. Reacts with ⏭ emote.


### d. Stop
    !stop
Stops the current song playing. Reacts with the ⏹ emote.


### e. Resume
    !resume 
Resumes the song that was paused.
