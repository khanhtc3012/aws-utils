#!/usr/bin/env node

import { RUMClient, GetAppMonitorDataCommand } from "@aws-sdk/client-rum"; // ES Modules import
import * as XLSX from "xlsx";
const client = new RUMClient({
  credentials: {
    secretAccessKey: "",
    accessKeyId: "",
  },
  region: "",
});

let isFetching = true;
let results = [];

const Previous30DaysTimestamp = new Date().getTime() - 86400 * 1000 * 30;
let currentTimestamp = new Date().getTime();

while (isFetching) {
  const input = {
    Name: "AppTrackingAPI", // required
    TimeRange: {
      After: Previous30DaysTimestamp,
      Before: currentTimestamp,
    },
    Filters: [
      // QueryFilters
      {
        Name: "EventType",
        Values: [
          // QueryFilterValueList
          "Tracking-API",
        ],
      },
    ],
    MaxResults: 100,
  };
  const command = new GetAppMonitorDataCommand(input);
  const response = await client.send(command);
  results.push(...response.Events);
  if (!response["NextToken"]) {
    isFetching = false;
    break;
  }

  currentTimestamp = JSON.parse(response["NextToken"])["timestamp"];
}

const unique = [
  ...new Map(
    results.map((ev) => JSON.parse(ev)).map((item) => [item["event_id"], item])
  ).values(),
];

const headers = [
  "response_code",
  "response_time",
  "response_text",
  "request_url",
];
const datas = unique.map((ev) => [
  ev["event_details"]["response_code"],
  ev["event_details"]["response_time"],
  ev["event_details"]["response_text"],
  ev["event_details"]["request_url"],
]);
const aoa = [...headers, ...datas];
const ws = XLSX.utils.aoa_to_sheet(aoa);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
XLSX.writeFile(wb, "TrackingAPI.xlsx");
