'''
This script imports tweets into the collabortweet platform.

If the tweet is
still available on Twitter, the html for the full rendered tweet (as it would
appear on Twitter) is extracted from the Twitter oEmbed API (see
https://developer.twitter.com/en/docs/twitter-for-websites/embedded-tweets/overview.html)

Author: Cody Buntain (creator), Fridolin Linder (modifications)

Usage:
    $> python embedTweets2sql.py [task_description_path] [sqlite_file_path]
    [tweet_json_path]

Arguments:
    task_description_path: json file with task data (see collabortweet
        documentation)
    sqlite_file_path: sqlite database file (default `pairComp.sqlite3`)
    tweet_json_path: json file containing one tweet per line in either twitter
    API format or GNIP format
'''
import sqlite3
import sys
import json
import html
import itertools
import random
import requests

# ==============================================================================
# Function definitions
# ==============================================================================

def get_embed(username, tweet_id, default="<pre></pre>"):
    '''Use Twitter's embed API endpoint to get the HTML for a tweet

    Arguments:
    ----------
    username: str, user's twitter screen name
    tweet_id: int, Twitter ID for the Tweet to be embedded
    default: str, default return value for tweets that can't be embedded

    Returns:
    ---------
    If tweet is available through API: str, html of embedded tweet
    If tweet is not available: default
    '''
    payload = {
        "url": html.escape("https://twitter.com/{}/status/{}".format(username,
                                                                     tweet_id))
    }
    req = requests.get('https://publish.twitter.com/oembed', params=payload)

    rendered_html = default

    # Try to get the HTML from Twitter's oEmbed API.
    #. we check if we get 200 Status OK code and if the "HTML" key is
    #. in the response before extracting it. Deleted tweets return 404,
    #. and some tweets return 403, which I assume means tweet is
    #. protected.
    try:
        if req.status_code == 200:
            resp = req.json()
            if "html" in resp:
                rendered_html = resp["html"] # replace default HTML
        else:
            print("Wrong Code:", req.status_code)
    except json.decoder.JSONDecodeError:
        print("Error on getting tweet:", tweet_id)
        print("Response Code:", req.status_code)
        print("Response:", req.text)
    return rendered_html

# Get the contents of this tweet
def read_tweet(tweet):
    '''Extract relevant content from tweet object

    Arguments:
    ---------
    tweet: dict, tweet in either native Twitter json format or GNIP format

    Returns:
    ---------
    html for the tweet (either as received from oembed endpoint or if tweet not
    available on twitter the extracted text with minimal html embedding.)
    '''
    temp = '{} - {}'
    if "text" in tweet: # Twitter format
        tweet_text = temp.format(tweet["user"]["screen_name"], tweet["text"])
        tweet_id = tweet["id"]
        tweet_user = tweet["user"]["screen_name"]
    elif "body" in tweet: # Gnip Format
        tweet_text = temp.format(tweet["actor"]["preferredUsername"],
                                 tweet["body"])
        idstr = tweet["id"]
        tweet_id = int(idstr[idstr.rfind(":")+1:])
        tweet_user = tweet["actor"]["preferredUsername"]
    else:
        raise ValueError('Tweet in unexpected format: {}'.format(tweet))

    default_html_text = "<pre>" + html.escape(tweet_text) + "</pre>"
    rendered_html = get_embed(tweet_user, tweet_id, default_html_text)

    return rendered_html, tweet_id

# ==============================================================================
# Script code
# ==============================================================================
if __name__ == '__main__':
    # Store the commandline arguments passed to the script
    TASK_DESC_PATH = sys.argv[1]
    SQLITE_PATH = sys.argv[2]
    TWEET_PATH = sys.argv[3]

    # If pairwise task get pair count
    if len(sys.argv) > 4:
        pair_count = int(sys.argv[4])
    else:
        pair_count = None

    # Load the task metadata from taskdescription
    with open(TASK_DESC_PATH, "r") as infile:
        task_desc = json.load(infile)
    print(task_desc)

    # For every tweet in the input json, generate extract the html and id
    tweetList = []
    with open(TWEET_PATH, "r") as infile:
        for line in infile:
            tweet = json.loads(line)

            tweet_html, tweet_id = read_tweet(tweet)

            if tweet_html is None:
                print("Skipping:", line)
                continue

            tweetList.append((tweet_html, tweet_id))


    # Insert the data into the database
    conn = sqlite3.connect(SQLITE_PATH)
    c = conn.cursor()

    c.execute('INSERT INTO tasks (taskName, question, taskType) VALUES (:name,'
              ':question,:type)', task_desc)
    task_id = c.lastrowid
    print("Task ID:", task_id)

    element_list = [(task_id, x[0], x[1]) for x in tweetList]
    element_ids = []
    for el_tup in element_list:
        c.execute('INSERT INTO elements (taskId, elementText, externalId) '
                  'VALUES (?,?,?)', el_tup)
        el_id = c.lastrowid
        element_ids.append(el_id)

    print("Element Count:", len(element_ids))

    # Only create pairs if the task type == 1 (i.e. pairwise comparison task)
    if task_desc["type"] == 1:
        # Create the pairs
        pair_list = None

        # If we didn't specify a number of pairs, find all
        if pair_count is None:
            pair_list = itertools.combinations(element_ids, 2)

        else: # Otherwise, randomly select k pairs
            pair_accum = set()
            for e_index, e_id in enumerate(element_ids):
                start_index = max(0, e_index-1)
                others = element_ids[:start_index] + element_ids[e_index+1:]

                # Put the pair in canonical order to avoid duplicates
                new_pairs = set(map(lambda x: (min(e_id, x), max(e_id, x)),
                                    random.sample(others, pair_count)))

                pair_accum = pair_accum.union(new_pairs)

            pair_list = list(pair_accum)

        pair_list = [(task_id, x[0], x[1]) for x in pair_list]
        print("Pair Count:", len(pair_list))

        c.executemany('INSERT INTO pairs (taskId, leftElement, rightElement) '
                      'VALUES (?,?,?)', pair_list)

    # If we are dealing with a labeling task (type == 2), insert the labels
    elif task_desc["type"] == 2:

        print("Insert labels...")
        label_list = [{"taskId": task_id, "labelText": x}
                      for x in task_desc["labels"]]
        print(label_list)

        c.executemany('INSERT INTO labels (taskId, labelText) VALUES (:taskId,'
                      ':labelText)', label_list)

    # Otherwise, we have an invalid task type
    else:
        conn.close()
        raise ValueError(
            "ERROR! Task type '{}' is not valid!".format(task_desc["type"]))

    conn.commit()
    conn.close()
