npm install --omit=dev --legacy-peer-deps


<?xml version="1.0" encoding="utf-8"?>
  <configuration>
    <system.webServer>
      <webSocket enabled="false" />

      <handlers>
        <add name="iisnode" path="dist/index.cjs" verb="*" modules="iisnode" />
      </handlers>

      <rewrite>
        <rules>
          <rule name="DynamicContent">
            <conditions>
              <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="True" />
              <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="True" />
            </conditions>
            <action type="Rewrite" url="dist/index.cjs" />
          </rule>
        </rules>
      </rewrite>

      <iisnode
        nodeProcessCommandLine="&quot;C:\Program Files\nodejs\node.exe&quot;"
        loggingEnabled="true"
        logDirectory="iisnode"
        devErrorsEnabled="true"
      />
    </system.webServer>
  </configuration>