# Project Note

- Before editing this project, read this CONTEXT.md and AGENT.md first.
- Before adding an external package, prefer existing project dependencies first.
- If a new package is needed, use an official React Native or Expo package when available.
- If there is no official package, use a well-maintained package that is among the most popular choices in the React Native Community.
- For Expo native modules, use npx expo install <package> so the installed version matches the project SDK.

# Project Context

This app is about the staff management system for the Faculty of Engineer, Prince of Songkhla University. The app contains many systems such as absence System, Timestamp System, Inform request for the services etc. 

The organization has many services already created from Web Application base. Therefore, All systems in this app are just UI that communicate through API Service that created each of the systems.

But the client does not link with the API Service directly. There is one project called “scooba-service”. The scooba-service is the gateway the client will send all request to this project and pass request to the real API Service of system

# Requirement

- The app can show news that feeds from University website
- The app must have an authentication system to identify user to access systems because this is a private application but some feature such as news feed is public
- The app have staff management system that show as modules such as absence, Forget Timestamp, Meeting, Repair Computer, Executive Calendar and Person Search systems
- The app can connect to exist API Services by modules for CRUD data
- The app build like as Mobile Application for iOS and Android
- The app can send push notification
- The app should have beautiful UI and good for UX

# Project Functionals

- News: The app feeds news from the website “http://www.eng.psu.ac.th”. This function is public everyone can see the news  No authenticate require
- Authenticate System: Before the user can access all the menus in this app. Users should sign in to use the services. This project uses the OpenID system for Auth. The OpenID system is the service that University provided 
- Menus or Modules: This app contains systems shown as a menu on the home screen. The menu will show after the user signs in success. The menus contains absence Menu, Forget Timestamp Menu, Meeting Menu, Repair Computer Menu, Person Search Menu and other system in the future
- Notification: The users in the organization will contact each other in this app such as sending information to do something. Some requests will tick the notification on the phone to related user. The notification system is based on Firebase Cloud Messaging.

# Project Struction

This project use React Native and Expo for development


# Module Description

The module meaning the application that work with user to send/recieve request and response. Now there are six module follow by:

- Abent Module: 
    # Module Context
    Send request for absence to Approver that can allow or deny request
    # User Group
    - General User: The user that inform for request
    - Approver: The leader of general user that can approve request    
    # Functional
    - User can send new absence inform
    - User can follow inform status
    - User can see the history of absence
    - Approver can allow or deny request
    
- Forget Timestamp:
    # Module Context
    Send request for forget timestamp to Approver to ensure that user are comming to work or forget stamp out when finish work
    # User Group
    - General User: The user that inform for request
    - Approver: The leader of general user that can approve reuqets
    # Functional
    - User can see what the date and time that user forgot to stamp in/out in work day
    - User can see history of forgot timestamp
    - Approver can allow or deny request

- Repair Computer:
    # Module Context
    This module is one of service of company when Computer or something else broke. User can send request to technician to repairs item
    # User Group
    - General User: The informer that send request
    - Foreman: Categorize job type and assign to the technician
    - Technician: The worker repair item
    # Functional
    - General User can send inform to ask for help
    - General User can follow status of job
    - General User can see inform history
    - Foreman can accept or reject job    
    - Foreman can assign job to the technician
    - Foreman can see all job history
    - Foreman can approve supply request that technician ask
    - Technician can accept or reject job that foreman assigned
    - Technician can record and report of repair detail
    - Technician can see work history
    - Technician can ask supply request from the foreman

- Meeting:
    # Module Context
    This module is show the list of meeting of logged in user. The data receive from the application through from API Service
    # Functional
    - User can see today meeting
    - User can see upcoming meeting
    - User can see meeting history

- Executive Calendar:
    # Module Context
    Show the events of executive that fetch from Google Calendar
    # Functional
    - User can see events by date
    - User can select calendar that want to see the detail

- Person Search:
    # Module Context
    Show the staff in the company by search with keyword
    # Functional
    User can put keyword to search and show data on the screen


# Build Environment

Each of the environments will use some variable, key, uri callback and setting are different. I will describe you. The app running on three environment follwing by:

- Web browser: Running on Expo that come together with React Native. 
- Emulator
- Real Device

Web browser and emulator alway use for testing only but real device use for testing too but you should simulate for real 

About OpenID system have two domains for auth callback 
- com.ecs.intaniaSB://oauth/callback: Use for emulator and Real Device
- http://localhost:8081/oauth/callback: Use for Expo Web Browser

The key of OpenID use different key I will put the detail in .env file of "intania-staff-buddy" project

About Push Notification the app can receive notification every environment such as Expo Web browser, Emulator and Real Device

# Sending requests
- The app does not send requests and receive responses directly from the real application but there is a gateway service called “scooba-service” as a medium. But the auth system and news rss feed call to service directly
- Every submit action that sends a POST, PUT, or DELETE request must show a YES/NO confirmation modal before sending the request.
- After the user confirms, show the loading/prefix animation and wait 1000ms before sending the request.
- After receiving the response data, wait 1500ms before continuing to the next operation.

# Other
- Bottom tab navigation: Screens inside a bottom tab menu must load data only when their tab is active. Do not load data for inactive tabs.
- If the data display as ListItems that have multiple line. The app should not load all data to display in one time. Just display like pagination when scroll down and get more data

