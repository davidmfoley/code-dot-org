# Sets path to locally-provided cookbooks for all metadata-provided dependencies.
# Add `depends [cookbook]` entries to `metadata.rb` and add the following line to `Berksfile`:
# instance_eval File.read('../local_cookbooks.rb'), __FILE__
Ridley::Chef::Cookbook::Metadata.from_file('metadata.rb').dependencies.keys.each do |cookbook|
  path = "../#{cookbook}"
  next unless File.directory? path
  cookbook cookbook, path: path
end

# Pin specific dependency versions:
cookbook 'seven_zip', '< 4.0.0' # 4.0.0 requires Chef 16
cookbook 'ark', '< 6.0.0' # 6.0 0 requires Chef 15.3
