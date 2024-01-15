#!/usr/bin/env python3
from codecs import ascii_encode
from collections import defaultdict, Counter
import glob
import json
from math import ceil
from time import sleep
import requests
import sys
import os
import threading
import csv

BASEURL = 'https://diavgeia.gov.gr/luminapi/api/search?q=decisionTypeUid:"Β.2.1" AND organizationUid:"%s"&page=%d&size=%d'
ADA_URL = 'https://diavgeia.gov.gr/luminapi/api/decisions/%s'
TYPES_URL = 'https://diavgeia.gov.gr/opendata/types.json'
TYPE_ADA_URL = 'https://diavgeia.gov.gr/luminapi/api/search?q=decisionType:"%s"'
LIST_URL = 'https://diavgeia.gov.gr/luminapi/api/search?q=decisionTypeUid:"Β.2.1" AND organizationUid:"%s"&page=%d&size=%d'

ORISTIKOPOIISI_PLIROMIS = "2.4.2"


def fetch_decisions_thread(org, start_page, end_page):
    print("Fetching decisions from page %d to page %d" %
          (start_page, end_page))
    decisions = []
    page_idx = start_page
    while(page_idx < end_page):
        DECISIONS_URL = BASEURL % (org, page_idx, 100)
        r = requests.get(DECISIONS_URL)
        if r.status_code != 200:
            print("Request %s failed with code:%d, will retry in a bit..." %
                  (DECISIONS_URL, r.status_code))
            sleep(1)
        else:
            decisions += r.json()['decisions']
            page_idx += 1
    f = open("decisions_%d.json" % page_idx, 'w')
    json.dump(decisions, f, ensure_ascii=False)
    f.close()
    d_idx = 0
    for d in decisions:
        print("Fetching decision %s" %
              (d["ada"]))
        f = open("%s.json" % (d["ada"]), 'w')
        r = requests.get(ADA_URL % (d["ada"]))
        json.dump(r.json(), f, ensure_ascii=False)
        f.close()
        d_idx += 1


def fetch_decisions(org):
    # We want to quickly find the number of total
    # decisions for this org, so we can properly
    # share the load between threads.
    r = requests.get(BASEURL % (org, 0, 10))
    total_decisions = r.json()['info']['total']
    print("Org %s has %d ADAs" % (org, total_decisions))
    remaining_decisions = total_decisions
    num_threads = 10
    results_per_page = 100
    pages_per_thread = int(
        max((total_decisions / results_per_page) / num_threads, 1) + 1)
    page_idx = 0
    fetcher_threads = []
    os.mkdir(org)
    os.chdir(org)
    for i in range(num_threads):
        remaining_pages = ceil(remaining_decisions / results_per_page)
        page_start = page_idx
        page_end = page_idx + min(pages_per_thread, remaining_pages)
        remaining_decisions -= min(remaining_decisions,
                                   (page_end - page_start)*results_per_page)
        page_idx = page_end
        if (page_end > page_start):
            x = threading.Thread(target=fetch_decisions_thread,
                                 args=(org, page_start, page_end))
            fetcher_threads.append(x)
            x.start()
        else:
            print("No need to add more threads...")
    for thread in fetcher_threads:
        thread.join()
    print("All threads completed!")
    os.chdir("../")


def standardize_afm(afm):
    afm = int(afm)


def normalize(data):
    # This can be further improved with something like this:
    # df['fixed_name'] = group_similar_strings(df['normalized_recipient_name'], n_blocks='auto', min_similarity=0.7)['group_rep_normalized_recipient_name'] .
    # While we can replace the whole function with string grouping, it seems more accurate to have
    # a first pass with locking the AFM and finding the most common name between same-AFM entries.
    # This is because some entries have the same AFM but completely different (grammatically) names. For example: ΕΚΘΕΣΙΑΚΕΣ ΕΦΑΡΜΟΓΕΣ VS Interexpo.
    # The grouper can be applied after AFM consolidation, to detect slight AFM errors.`
    normalized_data = []
    f = open('diaygeia_orgs.json', 'r')
    orgs = json.load(f)
    f.close()
    for d in data:
        undefined_values = [None, '', "0", "000000000", "-"]
        for k in d.keys():
            if d[k] in undefined_values:
                d[k] = 'undefined'
        try:
            if d("recipient_afm") != 'undefined':
                d["recipient_afm"] = d["recipient_afm"].zfill(9)
        except:
            pass
    uid_name_directory = defaultdict()
    afm_name_directory = defaultdict()
    for org in orgs:
        uid_name_directory[org.get("uid")] = org["label"]
        afm_name_directory[org.get("vatNumber")] = org["label"]

    afms_alternate_names = defaultdict(list)
    for d in data:
        afms_alternate_names[d["recipient_afm"]].append(d["recipient_name"])
    for afm in afms_alternate_names:
        if afm == 'undefined':
            continue
        afm_name_directory[afm] = Counter(
            afms_alternate_names[afm]).most_common()[0][0]
    for d in data:
        if d.get('org_uid') and uid_name_directory.get(d.get('org_uid')):
            norm_name = uid_name_directory.get(d.get('org_uid'))
        else:
            norm_name = d.get('org_name')
        d["normalized_org_name"] = "%s (%s)" % (
            norm_name, d.get('org_uid'))
        if d.get('recipient_afm') and afm_name_directory.get(d.get('recipient_afm')):
            norm_name = afm_name_directory.get(d.get('recipient_afm'))
        else:
            norm_name = d.get('recipient_name')
        d['normalized_recipient_name'] = "%s (%s)" % (
            norm_name, d.get('recipient_afm'))
        normalized_data.append(d)
    return normalized_data


def parse_org_decisions(org):
    flat_decisions = []
    os.chdir(org)
    ada_files = glob.glob("*.json")
    ada_files = [x for x in ada_files if x.find('deci') < 0]
    for ada_f in ada_files:
        f = open(ada_f, "r")
        _d = json.load(f)
        f.close()
        try:
            ada = _d.get("ada")
            metadata_url = _d.get("url")
            document_url = _d.get("documentUrl")
            publish_timestamp = _d.get("publishTimestamp")
            org_name = _d.get("extraFieldValues").get("org").get("name")
            org_afm = _d.get("extraFieldValues").get("org").get("afm")
        except:
            print("Failed to parse ADA %s --- skipping..." % ada_f)
            continue
        sponsors = _d["extraFieldValues"]["sponsor"]
        for sponsor in sponsors:
            try:
                amount = sponsor.get("expenseAmount").get("amount")
                recipient_afm = sponsor.get(
                    "sponsorAFMName").get("afm")
                recipient_name = sponsor.get("sponsorAFMName").get("name")
                flat_decisions.append(
                    {"ada": ada, "metadata_url": metadata_url, "document_url": document_url, "publish_timestamp": publish_timestamp, "amount": amount, "recipient_name": recipient_name, "recipient_afm": recipient_afm, "org_name": org_name, "org_uid": org, "org_afm": org_afm})
            except:
                print("Failed to get data:%s" % sponsor)
    os.chdir("../")
    return flat_decisions


def ada_types_counts():
    type_breakdown = {}
    r = requests.get(TYPES_URL)
    if r.status_code != 200:
        print("Request failed (%d:%s)" % (r.status_code, r.url))
        return
    types = r.json()["decisionTypes"]
    for type in types:
        uid = type['uid']
        label = type['label']
        url = TYPE_ADA_URL % label
        count = -1
        r = requests.get(url)
        if (r.status_code != 200):
            print("Request failed (%d:%s)" % (r.status_code, r.url))
        else:
            count = r.json()['info']['total']
        type_breakdown[label] = count
    with open('types_breakdown.csv', 'w') as f:
        w = csv.DictWriter(f, type_breakdown.keys())
        w.writeheader()
        w.writerow(type_breakdown)


DETH_UID = "99220970"
ELTA_UID = "50039"
OREOKASTRO_UID = "6323"

orgs = [OREOKASTRO_UID, DETH_UID, ELTA_UID]

# for org in orgs:
#     os.chdir("/Users/yiannis/dev/datagovgr/")
#     fetch_decisions(org)


# flat_data = []
# for org in orgs:
#     os.chdir("/Users/yiannis/dev/datagovgr/")
#     flat_data += parse_org_decisions(org)
# flat_data = normalize(flat_data)
# with open('cash_flow.csv', 'w') as f:
#     w = csv.DictWriter(f, flat_data[0].keys())
#     w.writeheader()
#     w.writerows(flat_data)

ada_types_counts()
