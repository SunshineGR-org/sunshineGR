#!/usr/bin/env python3
import argparse
import shlex
import sys
from dateutil.rrule import rrule, DAILY
from datetime import datetime
import subprocess
CONSOLIDATION_QUEUE = 'date-consolidation'
CONSOLIDATION_SERVICE_URL = 'https://daily-consolidation-srv-2tezuqb66a-ew.a.run.app/consolidate'
DECISION_DAILY_LIST_QUEUE = 'date'
DECISION_DAILY_LIST_SERVICE_URL = 'https://daily-list-retriever-srv-2tezuqb66a-ew.a.run.app/dailylist'
TASK_CMD = 'gcloud tasks create-http-task --queue=%s --url=%s --oidc-service-account-email=datagovgr-service-account@datagovgr.iam.gserviceaccount.com --location=europe-west1 --body-content={\\\"date\\\":\\\"%s\\\"} --header="Content-Type":"application/json"'

# try:
#     start_year, start_month, start_day = [
#         int(x) for x in sys.argv[1].split('-')]
#     end_year, end_month, end_day = [int(x) for x in sys.argv[2].split('-')]

#     start_date = datetime(start_year, start_month, start_day)
#     end_date = datetime(end_year, end_month, end_day)

#     for d in rrule(dtstart=start_date, freq=DAILY, until=end_date):
#         cmd = TASK_CMD % d.strftime('%Y-%m-%d')
#         print(cmd)
#         subprocess.run(shlex.split(cmd))
# except Exception as e:
#     print(e)
#     print("usage: daily_task_creator.py start_date end_date")
#     print("dates are inclusive, and expected format is YYYY-mm-dd")
#     sys.exit(0)


def create_task(date):
    cmd = TASK_CMD % (CONSOLIDATION_QUEUE, CONSOLIDATION_SERVICE_URL, date)
    print(cmd)
    subprocess.run(shlex.split(cmd))

# Gets two options from command line.
# -s start_date
# -e end_date
# -f file_name that includes list of dates in YYYY-mm-dd format.
# If -f is provided, -s and -e are ignored.
# If -f is not provided, -s and -e are required.
# -h or --help for help


def menu():
    parser = argparse.ArgumentParser(description='Daily Task Creator')
    parser.add_argument('-s', '--start_date', type=str,
                        help='Start date in YYYY-mm-dd format')
    parser.add_argument('-e', '--end_date', type=str,
                        help='End date in YYYY-mm-dd format')
    parser.add_argument('-f', '--file_name', type=str,
                        help='File name that includes list of dates in YYYY-mm-dd format')
    args = parser.parse_args()
    if args.file_name:
        with open(args.file_name) as f:
            for line in f:
                create_task(line.strip())
    elif args.start_date and args.end_date:
        start_date = datetime.strptime(args.start_date, '%Y-%m-%d')
        end_date = datetime.strptime(args.end_date, '%Y-%m-%d')
        for d in rrule(dtstart=start_date, freq=DAILY, until=end_date):
            create_task(d.strftime('%Y-%m-%d'))
    else:
        parser.print_help()
        sys.exit(0)


if __name__ == "__main__":
    menu()
