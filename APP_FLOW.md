//Starts with fresh list on each loading of the server
OnLoad -> 
  browser requests nextsong ->
    pop first from default_list
    return first from default_list
    push first into back of default_list

OnSongEnd ->
  browser requests nextsong ->
  if requested_list
    remove song from requested_list
  if requested_list empty
    pop first from default_list
    return first from default_list
    push first into back of default_list

OnTweet ->
  push to back of requested_list





