package main

import (
    "encoding/json"
    "fmt"
    "io/ioutil"
    "log"
    "net/http"
    "strings"
    "sync"
    "time"

    "github.com/gorilla/mux"
)

const (
    url = "http://SERVERIP:3000/"
)

type TrafficData struct {
    ReceivedTraffic string `json:"receivedTraffic"`
    SentTraffic     string `json:"sentTraffic"`
    Alert           bool   `json:"alert"`
}

type MainTrafficData struct {
    ReceivedTraffic string `json:"receivedTraffic"`
    SentTraffic     string `json:"sentTraffic"`
    Packets         int    `json:"packets"`
    Alert           bool   `json:"alert"`
    MitigationStatus string `json:"mitigationStatus"`
}

type ConnectionCount struct {
    Connections map[string]int `json:"-"`
}

var ipCount = make(map[string]int)
var mu sync.Mutex

func getMainTraffic(url string) (*MainTrafficData, error) {
    var data MainTrafficData
    resp, err := http.Get(url + "get-maintraffic-data")
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusOK {
        return nil, fmt.Errorf("status code error: %d", resp.StatusCode)
    }

    body, err := ioutil.ReadAll(resp.Body)
    if err != nil {
        return nil, err
    }

    err = json.Unmarshal(body, &data)
    if err != nil {
        return nil, err
    }

    return &data, nil
}

func getTraffic(url string) (*TrafficData, error) {
    var data TrafficData
    resp, err := http.Get(url + "get-traffic-data")
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusOK {
        return nil, fmt.Errorf("status code error: %d", resp.StatusCode)
    }

    body, err := ioutil.ReadAll(resp.Body)
    if err != nil {
        return nil, err
    }

    err = json.Unmarshal(body, &data)
    if err != nil {
        return nil, err
    }

    return &data, nil
}

func getConnectionCount(url string) (map[string]int, error) {
    var data map[string]int
    resp, err := http.Get(url + "get-connection-count")
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusOK {
        return nil, fmt.Errorf("status code error: %d", resp.StatusCode)
    }

    body, err := ioutil.ReadAll(resp.Body)
    if err != nil {
        return nil, err
    }

    err = json.Unmarshal(body, &data)
    if err != nil {
        return nil, err
    }

    return data, nil
}

func detectDDoS(req *http.Request) bool {
    ip := req.RemoteAddr
    mu.Lock()
    ipCount[ip]++
    mu.Unlock()

    if ipCount[ip] > 100 {
        return true
    }

    return false
}

func detectDDoSMethod(trafficData *TrafficData) (string, error) {
    methods := []string{
        "tcp_ack",
        "tcp_psh",
        "syn",
        "sadp",
        "dns",
        "udp",
        "fragment",
        "ack",
        "syn",
        "rst",
        "fin",
        "icmp",
        "igmp",
        "tcp",
        "udp",
        "icmpv6",
        "igmpv6",
    }
    
    var detectedMethod string
    for _, method := range methods {
        if strings.Contains(strings.ToLower(trafficData.ReceivedTraffic), method) {
            detectedMethod = method
            break 
        }
    }

    return detectedMethod, nil
}

func main() {
    router := mux.NewRouter()
    router.HandleFunc("/ddos-detection", func(w http.ResponseWriter, r *http.Request) {
        if detectDDoS(r) {
            w.WriteHeader(http.StatusForbidden)
            fmt.Fprint(w, "DDoS attack detected")
        } else {
            w.WriteHeader(http.StatusOK)
            fmt.Fprint(w, "No DDoS attack detected")
        }
    })

    go func() {
        var trafficData *TrafficData
        var err error
        for {
            clearScreen()
            fmt.Println("Network Status Update")
            
            fmt.Println("---------------------------------------------------")
            fmt.Println("Received Traffic Data:")
            fmt.Println("---------------------------------------------------")
            
            trafficData, err = getTraffic(url)
            if err != nil {
                log.Println(err)
            } else {
                fmt.Printf("Received Traffic: %s\n", trafficData.ReceivedTraffic)
                fmt.Printf("Sent Traffic: %s\n", trafficData.SentTraffic)
                fmt.Printf("Alert: %v\n", trafficData.Alert)
            }
            
            fmt.Println("---------------------------------------------------")
            fmt.Println("Bypassed Traffic Data:")
            fmt.Println("---------------------------------------------------")
            
            mainTrafficData, err := getMainTraffic(url)
            if err != nil {
                log.Println(err)
            } else {
                fmt.Printf("Received Traffic: %s\n", mainTrafficData.ReceivedTraffic)
                fmt.Printf("Sent Traffic: %s\n", mainTrafficData.SentTraffic)
                fmt.Printf("Packets: %d\n", mainTrafficData.Packets)
                fmt.Printf("Alert: %v\n", mainTrafficData.Alert)
                fmt.Printf("Mitigation Status: %s\n", mainTrafficData.MitigationStatus)
            }
            
            fmt.Println("---------------------------------------------------")
            fmt.Println("Connection Count:")
            fmt.Println("---------------------------------------------------")
            
            connectionCount, err := getConnectionCount(url)
            if err != nil {
                log.Println(err)
            } else {
                var maxCount int
                var maxIp string
                for ip, count := range connectionCount {
                    if count > maxCount {
                        maxCount = count
                        maxIp = ip
                    }
                }
                fmt.Printf("IP %s: %d connections (Most Connections)\n", maxIp, maxCount)
                for ip, count := range connectionCount {
                    if ip != maxIp {
                        fmt.Printf("IP %s: %d connections\n", ip, count)
                    }
                }
                var totalCount int
                for _, count := range connectionCount {
                    totalCount += count
                }
                fmt.Printf("\n---------------------------------------------------\n")
                fmt.Printf("Total Server Connections: %d\n", totalCount)
            }
            
            fmt.Println("---------------------------------------------------")
            fmt.Println("DDoS Method Detection:")
            fmt.Println("---------------------------------------------------")
            
            trafficData, err = getTraffic(url)
            if err != nil {
                log.Println(err)
            } else {
                method, err := detectDDoSMethod(trafficData)
                if err != nil {
                    log.Println(err)
                } else {
                    fmt.Printf("Detected DDoS Method: %s\n", method)
                }
            }
            
            time.Sleep(2 * time.Second)
        }
    }()

    log.Fatal(http.ListenAndServe(":8080", router))
}

func clearScreen() {
    
    fmt.Print("\033[H\033[2J")
}
